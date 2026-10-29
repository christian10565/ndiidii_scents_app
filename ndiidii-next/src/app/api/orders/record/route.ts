import { NextRequest, NextResponse } from 'next/server';
import { verifyTransaction, isLive } from '@/lib/paystack';
import {
  recordOrder,
  getOrder,
  getPendingOrder,
  deletePendingOrder,
  isConfigured,
} from '@/lib/orders';

/**
 * POST /api/orders/record
 * Body: { ref }
 *
 * Finalises an order the server itself priced and parked in Redis at
 * /api/paystack/initialize. The client contributes ONE thing: the reference.
 * Items, totals and the gift-card portion all come from the pending order, so a
 * browser can no longer invent an order or a discount.
 *
 * Best-effort on the ledger write — always 200 once verified, so a Redis hiccup
 * never blocks the customer's success screen.
 */
export async function POST(req: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json({ ok: true, recorded: false });
  }

  let body: { ref?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const ref = typeof body.ref === 'string' ? body.ref.trim() : '';
  if (!ref) {
    return NextResponse.json({ error: 'ref is required' }, { status: 400 });
  }

  // Idempotency: already finalised.
  const existing = await getOrder(ref);
  if (existing) {
    return NextResponse.json({ ok: true, recorded: false, duplicate: true });
  }

  const pending = await getPendingOrder(ref);
  if (!pending) {
    return NextResponse.json(
      { error: 'Unknown order reference — it was never priced by this store, or it expired.' },
      { status: 400 },
    );
  }

  const giftAmount = pending.giftCard?.amount ?? 0;
  const expectedCharge = Math.max(0, pending.grandTotal - giftAmount);
  let amountCharged = 0;

  if (pending.method !== 'giftcard' && isLive()) {
    try {
      const verified = await verifyTransaction(ref);
      if (verified.status !== 'success') {
        return NextResponse.json({ error: `Payment not successful: ${verified.status}` }, { status: 400 });
      }
      amountCharged = verified.amountNaira;
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Verification failed' },
        { status: 502 },
      );
    }
    // The amount Paystack actually collected must equal what we priced. This is
    // the check the Paystack docs require and the old flow never did.
    if (Math.abs(amountCharged - expectedCharge) > 0.5) {
      return NextResponse.json(
        { error: 'Charged amount does not match the priced order.' },
        { status: 400 },
      );
    }
  }

  await recordOrder({
    ref,
    at: pending.at,
    email: pending.email,
    items: pending.lines.map((l) => ({ name: `${l.label} — ${l.detail}`, qty: l.qty, price: l.price })),
    delivery: pending.delivery,
    amountCharged,
    giftCard: pending.giftCard,
    total: pending.grandTotal,
    method: pending.method,
  });

  await deletePendingOrder(ref);
  return NextResponse.json({ ok: true, recorded: true });
}
