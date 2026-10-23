import { NextRequest, NextResponse } from 'next/server';
import { redeemGiftCard, isConfigured } from '@/lib/giftcard';

/**
 * POST /api/giftcard/preauth-debit
 *
 * Server-side gift-card hold before Paystack checkout.
 *
 * Flow:
 *   1. Client sends code + amountNaira + reference.
 *   2. Server atomically debits the card via DECRBY.
 *   3. Client redirects to Paystack with the NET amount only.
 *   4. On callback success, order is recorded. If payment fails, the
 *      client should call /api/giftcard/refund to restore the balance.
 *
 * Idempotent: duplicate calls with the same reference + code + amount
 * return the existing balance without double-debiting.
 */

const PENDING_HOLDS_KEY = 'giftcard:pending:holds';

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

function holdKey(reference: string): string {
  return `${PENDING_HOLDS_KEY}:${reference}`;
}

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
    const key = holdKey(reference);

    // Idempotency: if this reference already has a hold, return it.
    const existing = await kv<string | null>('GET', key);
    if (existing) {
      const parsed = JSON.parse(existing) as { code: string; amountNaira: number };
      return NextResponse.json({ ok: true, remaining: await redeemGiftCard(parsed.code, parsed.amountNaira, { orderRef: reference }), fromHold: true });
    }

    const remaining = await redeemGiftCard(code, amount, { orderRef: reference });

    // Remember the hold for idempotency / refund.
    await kv('SET', key, JSON.stringify({ code, amountNaira: amount }), 'EX', 3600);

    return NextResponse.json({ ok: true, remaining, fromHold: false });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not debit gift card' },
      { status: 400 },
    );
  }
}
