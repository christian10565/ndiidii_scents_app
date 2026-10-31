import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { finalizeOrder } from '@/lib/orders';

/**
 * POST /api/paystack/webhook
 *
 * Paystack POSTs `charge.*` events here. Authenticity is proven by an
 * HMAC-SHA512 of the RAW request body under the secret key, carried in the
 * `x-paystack-signature` header. We verify that before trusting anything, so a
 * forged "success" event can't mint orders.
 *
 * On `charge.success` we finalise the pending order (the same path the redirect
 * callback uses), so a paid order is never lost when the customer closes the
 * tab before the callback runs.
 *
 * Anything with a valid signature is acknowledged with 200 so Paystack stops
 * retrying; only a bad/missing signature gets a non-200.
 */

function verifySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = createHmac('sha512', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(signature, 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const rawBody = await req.text();
  const signature = req.headers.get('x-paystack-signature');

  if (!secret || !verifySignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: { event?: string; data?: { reference?: string; status?: string; amount?: number } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Only successful charges are acted on; acknowledge everything else.
  if (event.event !== 'charge.success') {
    return NextResponse.json({ received: true });
  }

  const reference = event.data?.reference;
  if (!reference) {
    return NextResponse.json({ received: true });
  }

  // The signed event is the source of truth — no second verify round-trip.
  const amountNaira = (event.data?.amount ?? 0) / 100;
  const outcome = await finalizeOrder(reference, { status: event.data?.status ?? '', amountNaira });

  if (!outcome.ok) {
    console.warn(`[webhook] finalize failed for ${reference}: ${outcome.error}`);
  }
  return NextResponse.json({ received: true, recorded: outcome.recorded });
}
