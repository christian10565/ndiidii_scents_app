import { NextRequest, NextResponse } from 'next/server';
import { refundGiftCard, isConfigured } from '@/lib/giftcard';

/**
 * POST /api/giftcard/refund
 *
 * Restore a previously held gift-card amount when an order is not
 * completed (Paystack failed, user abandoned, etc.).
 *
 * Body: { code, amountNaira, reference }
 */

async function kv<T = unknown>(...args: (string | number)[]): Promise<T> {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error('KV is not configured');
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args.map((a) => String(a))),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.result as T;
}

const PENDING_HOLDS_KEY = 'giftcard:pending:holds';

export async function POST(req: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json({ error: 'Gift cards are not configured' }, { status: 503 });
  }

  let body: { code?: string; amountNaira?: number; reference?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { code, amountNaira, reference } = body;
  const amount = Number(amountNaira);

  if (!code || !reference || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { error: 'code, positive amountNaira, and reference are required' },
      { status: 400 },
    );
  }

  try {
    const remaining = await refundGiftCard(code, amount);

    // Clear the hold so a future successful order can reuse the reference
    // if needed, or just to keep the holds table clean.
    try {
      await kv('DEL', `${PENDING_HOLDS_KEY}:${reference}`);
    } catch {
      /* non-fatal */
    }

    return NextResponse.json({ ok: true, remaining });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not refund gift card' },
      { status: 400 },
    );
  }
}
