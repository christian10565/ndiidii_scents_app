import { NextRequest, NextResponse } from 'next/server';
import { redeemGiftCard, isConfigured } from '@/lib/giftcard';

/**
 * POST /api/giftcard/redeem
 * Atomically deducts an amount from a gift card. Used when an order is fully
 * covered by a card, or after Paystack confirms a partially-covered order.
 * Body: { code, amountNaira, orderRef? }
 */
export async function POST(req: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json({ error: 'Gift cards are not configured' }, { status: 503 });
  }
  let body: { code?: string; amountNaira?: number; orderRef?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const amountNaira = Number(body.amountNaira);
  if (!body.code || !Number.isFinite(amountNaira) || amountNaira <= 0) {
    return NextResponse.json({ error: 'code and a positive amountNaira are required' }, { status: 400 });
  }
  try {
    const remaining = await redeemGiftCard(body.code, amountNaira, { orderRef: body.orderRef });
    return NextResponse.json({ ok: true, remaining });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not redeem gift card' },
      { status: 400 },
    );
  }
}
