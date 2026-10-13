import { NextRequest, NextResponse } from 'next/server';
import { getGiftCard, isConfigured } from '@/lib/giftcard';

/**
 * GET /api/giftcard/balance?code=NDII-XXXX-XXXX
 * Returns the remaining balance for a gift card code (the "check balance" box).
 */
export async function GET(req: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json({ error: 'Gift cards are not configured' }, { status: 503 });
  }
  const code = req.nextUrl.searchParams.get('code');
  if (!code) {
    return NextResponse.json({ error: 'code is required' }, { status: 400 });
  }
  try {
    const card = await getGiftCard(code);
    if (!card) {
      return NextResponse.json({ found: false }, { status: 404 });
    }
    return NextResponse.json({ found: true, code: card.code, balance: card.balance, initial: card.initial });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Lookup failed' },
      { status: 500 },
    );
  }
}
