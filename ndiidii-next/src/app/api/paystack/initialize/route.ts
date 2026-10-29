import { NextRequest, NextResponse } from 'next/server';
import { initializeTransaction, isLive } from '@/lib/paystack';
import { quoteCart, PricingError } from '@/lib/pricing';
import { savePendingOrder, isConfigured as ledgerConfigured } from '@/lib/orders';
import { getGiftCard, redeemGiftCard, refundGiftCard, isConfigured as giftConfigured } from '@/lib/giftcard';
import type { CartPayload } from '@/lib/quote';

interface Delivery {
  name?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  notes?: string;
}

/**
 * POST /api/paystack/initialize
 *
 * Body: { email, cart: { sets, bottles, discovery }, delivery, giftCode? }
 *
 * Prices are NOT accepted from the client. The cart is repriced from the
 * catalog here (`lib/pricing.ts`), a pending order is parked in Redis under the
 * new reference, and only the server-computed total is charged. `orders/record`
 * later reads that pending order back instead of trusting the browser.
 *
 * A gift card, if supplied, is debited server-side for min(balance, grandTotal)
 * before Paystack is called. Fully-covered orders return `fullyCovered: true`
 * and never touch Paystack.
 */
export async function POST(req: NextRequest) {
  let body: {
    email?: string;
    cart?: CartPayload;
    delivery?: Delivery;
    giftCode?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const email = (body.email || '').trim();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'A valid email address is required' }, { status: 400 });
  }
  if (!body.cart) {
    return NextResponse.json({ error: 'A cart is required' }, { status: 400 });
  }

  let quote;
  try {
    quote = await quoteCart(body.cart);
  } catch (err) {
    const status = err instanceof PricingError ? err.status : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not price this cart' },
      { status },
    );
  }

  const d = body.delivery ?? {};
  const reference = `ndiidii-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // ---- Gift card (server-side, before payment) ----
  let giftCredit = 0;
  let giftCode: string | null = null;
  const requestedCode = (body.giftCode || '').trim();
  if (requestedCode) {
    if (!giftConfigured()) {
      return NextResponse.json({ error: 'Gift cards are not configured' }, { status: 503 });
    }
    const card = await getGiftCard(requestedCode);
    if (!card) {
      return NextResponse.json({ error: 'No gift card found with that code.' }, { status: 400 });
    }
    giftCredit = Math.min(card.balance, quote.grandTotal);
    if (giftCredit > 0) {
      try {
        await redeemGiftCard(card.code, giftCredit, { orderRef: reference });
        giftCode = card.code;
      } catch (err) {
        return NextResponse.json(
          { error: err instanceof Error ? err.message : 'Could not apply gift card' },
          { status: 400 },
        );
      }
    }
  }

  const amountNaira = Math.max(0, quote.grandTotal - giftCredit);
  const method = giftCredit > 0 ? (amountNaira > 0 ? 'mixed' : 'giftcard') : 'paystack';

  // Park what we priced. Best-effort: without Redis we fall back to the old
  // behaviour where the browser supplies the summary at callback time.
  if (ledgerConfigured()) {
    try {
      await savePendingOrder({
        ref: reference,
        at: new Date().toISOString(),
        email,
        lines: quote.lines,
        total: quote.grandTotal,
        grandTotal: quote.grandTotal,
        delivery: d,
        giftCard: giftCode ? { code: giftCode, amount: giftCredit } : undefined,
        method,
      });
    } catch {
      /* never block a payment on the ledger */
    }
  }

  // Fully covered by the gift card — nothing to charge.
  if (amountNaira <= 0) {
    return NextResponse.json({
      fullyCovered: true,
      reference,
      amountNaira: 0,
      quote,
      giftCard: giftCode ? { code: giftCode, amount: giftCredit } : undefined,
    });
  }

  const orderLines = quote.lines
    .map((l) => `${l.qty} × ${l.label} — ₦${(l.qty * l.price).toLocaleString('en-NG')}`)
    .join('\n');
  const custom_fields = [
    { display_name: 'Order Items', variable_name: 'order_items', value: orderLines || '—' },
    { display_name: 'Delivery To', variable_name: 'delivery_to', value: [d.name, d.phone].filter(Boolean).join(' · ') || '—' },
    { display_name: 'Delivery Address', variable_name: 'delivery_address', value: [d.address, d.city, d.state].filter(Boolean).join(', ') || '—' },
  ];
  if (d.notes) {
    custom_fields.push({ display_name: 'Order Notes', variable_name: 'order_notes', value: d.notes });
  }

  try {
    const result = await initializeTransaction({
      email,
      amountNaira,
      reference,
      callbackUrl: `${req.nextUrl.origin}/checkout/callback`,
      metadata: {
        custom_fields,
        // Keep the server-priced order on the Paystack transaction itself, so a
        // lost pending-order key can still be reconciled from the dashboard.
        order_total_naira: quote.grandTotal,
        gift_card_naira: giftCredit,
      },
    });
    return NextResponse.json({ ...result, amountNaira, quote, isLive: isLive() });
  } catch (err) {
    // Payment never started — put the gift-card money back.
    if (giftCode && giftCredit > 0) {
      try {
        await refundGiftCard(giftCode, giftCredit);
      } catch {
        /* refund retried by the callback on failure */
      }
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Initialize failed' },
      { status: 500 },
    );
  }
}
