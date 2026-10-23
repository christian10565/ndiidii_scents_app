import { NextRequest, NextResponse } from 'next/server';
import { verifyTransaction, isLive } from '@/lib/paystack';
import { recordOrder, getOrder, isConfigured } from '@/lib/orders';

/**
 * POST /api/orders/record
 * Records a completed order in the Redis audit ledger. Called by the checkout
 * callback once payment is confirmed. Best-effort — always returns 200 so a
 * ledger hiccup never blocks the customer's success screen.
 *
 * Body: an OrderRecord { ref, email, items, amountCharged, total, method, ... }
 */

export async function POST(req: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json({ ok: true, recorded: false });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const ref = typeof body.ref === 'string' ? body.ref.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  if (!ref || !email) {
    return NextResponse.json({ error: 'ref and email are required' }, { status: 400 });
  }

  // Idempotency: if we already recorded this ref, accept without re-recording.
  const existing = await getOrder(ref);
  if (existing) {
    return NextResponse.json({ ok: true, recorded: false, duplicate: true });
  }

  // Server-side verification against Paystack for paid orders.
  const method = body.method ?? 'paystack';
  let amountCharged = Number(body.amountCharged) || 0;
  if (method !== 'giftcard' && isLive()) {
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
  }

  const order = {
    ref,
    at: new Date().toISOString(),
    email,
    items: Array.isArray(body.items) ? body.items : [],
    delivery: body.delivery,
    amountCharged,
    giftCard: body.giftCard,
    total: Number(body.total) || 0,
    method,
  };

  await recordOrder(order);
  return NextResponse.json({ ok: true, recorded: true });
}