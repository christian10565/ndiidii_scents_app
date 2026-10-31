import { NextRequest, NextResponse } from 'next/server';
import { initializeTransaction } from '@/lib/paystack';
import { GIFT_CARD_AMOUNTS_NGN } from '@/lib/store.config';

/**
 * POST /api/giftcard/initialize
 *
 * Starts a Paystack transaction for a fixed-amount gift card. The amount is
 * server-enforced against the offered denominations — the client never sets
 * the price. The card itself is created by /api/giftcard/purchase after the
 * payment confirms (via the redirect callback).
 *
 * Body: { email, amountNaira, note? }
 */
export async function POST(req: NextRequest) {
  let body: { email?: string; amountNaira?: number; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const email = (body.email || '').trim();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'A valid email address is required' }, { status: 400 });
  }

  const amountNaira = Number(body.amountNaira);
  if (!GIFT_CARD_AMOUNTS_NGN.includes(amountNaira)) {
    const allowed = GIFT_CARD_AMOUNTS_NGN.map((n) => `₦${n.toLocaleString('en-NG')}`).join(', ');
    return NextResponse.json({ error: `Amount must be one of: ${allowed}` }, { status: 400 });
  }

  // Distinct reference prefix so a gift-card charge is never mistaken for an order.
  const reference = `ndiidii-gc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  try {
    const result = await initializeTransaction({
      email,
      amountNaira,
      reference,
      callbackUrl: `${req.nextUrl.origin}/checkout/callback`,
      metadata: {
        gift_card: true,
        gift_card_naira: amountNaira,
        note: body.note || '',
      },
    });
    return NextResponse.json({ ...result, amountNaira });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Initialize failed' },
      { status: 500 },
    );
  }
}
