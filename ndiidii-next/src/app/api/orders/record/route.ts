import { NextRequest, NextResponse } from 'next/server';
import { recordOrder, isConfigured, type OrderRecord } from '@/lib/orders';

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
    // Ledger not configured — accept and no-op so the flow still completes.
    return NextResponse.json({ ok: true, recorded: false });
  }
  let body: Partial<OrderRecord>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body.ref || !body.email) {
    return NextResponse.json({ error: 'ref and email are required' }, { status: 400 });
  }
  const order: OrderRecord = {
    ref: body.ref,
    at: new Date().toISOString(),
    email: body.email,
    items: Array.isArray(body.items) ? body.items : [],
    delivery: body.delivery,
    amountCharged: Number(body.amountCharged) || 0,
    giftCard: body.giftCard,
    total: Number(body.total) || 0,
    method: body.method ?? 'paystack',
  };
  await recordOrder(order);
  return NextResponse.json({ ok: true, recorded: true });
}
