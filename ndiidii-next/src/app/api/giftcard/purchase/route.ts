import { NextRequest, NextResponse } from 'next/server';
import { createGiftCard, isConfigured } from '@/lib/giftcard';
import { recordGiftCardIssued } from '@/lib/orders';

/**
 * POST /api/giftcard/purchase
 * Called after a successful Paystack payment for a gift card. Creates the
 * gift card in Redis and returns its code (shown on-screen for the buyer to
 * share). In a fuller setup this would be triggered by the Paystack webhook;
 * for now the client calls it right after verify returns success.
 *
 * Body: { amountNaira, note?, orderRef? }
 */
export async function POST(req: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json({ error: 'Gift cards are not configured' }, { status: 503 });
  }
  let body: { amountNaira?: number; note?: string; orderRef?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const amountNaira = Number(body.amountNaira);
  if (!Number.isFinite(amountNaira) || amountNaira <= 0) {
    return NextResponse.json({ error: 'A positive amountNaira is required' }, { status: 400 });
  }
  try {
    const card = await createGiftCard({ amountNaira, note: body.note });
    // Record the card in the issuance ledger (best-effort audit trail — the
    // function swallows its own errors, so a ledger write can't fail the purchase).
    await recordGiftCardIssued({
      code: card.code,
      amount: card.initial,
      at: card.createdAt,
      orderRef: body.orderRef,
    });
    return NextResponse.json({ code: card.code, balance: card.balance, initial: card.initial });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not create gift card' },
      { status: 500 },
    );
  }
}
