import { NextRequest, NextResponse } from 'next/server';
import { finalizeOrder, isConfigured } from '@/lib/orders';

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

  const outcome = await finalizeOrder(ref);
  if (!outcome.ok) {
    return NextResponse.json({ error: outcome.error }, { status: outcome.status ?? 500 });
  }
  return NextResponse.json({
    ok: true,
    recorded: outcome.recorded,
    ...(outcome.duplicate ? { duplicate: true } : {}),
  });
}
