import { NextRequest, NextResponse } from 'next/server';
import { verifyTransaction } from '@/lib/paystack';

/**
 * GET /api/paystack/verify?reference=...
 * Verifies a transaction server-side after Paystack redirects back. Per the
 * docs, the caller must confirm data.status === 'success' AND the amount
 * matches the order before delivering value. We return the verified facts; the
 * callback page decides what to show and clears the cart.
 */
export async function GET(req: NextRequest) {
  const reference = req.nextUrl.searchParams.get('reference');
  if (!reference) {
    return NextResponse.json({ error: 'reference is required' }, { status: 400 });
  }

  try {
    const result = await verifyTransaction(reference);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Verify failed' },
      { status: 500 },
    );
  }
}
