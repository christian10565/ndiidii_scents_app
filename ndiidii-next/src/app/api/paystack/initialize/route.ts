import { NextRequest, NextResponse } from 'next/server';
import { initializeTransaction } from '@/lib/paystack';

interface PayItem { name: string; qty: number; price: number }
interface Delivery { name?: string; phone?: string; address?: string; city?: string; state?: string; notes?: string }

/**
 * POST /api/paystack/initialize
 * Body: { email, amountNaira, items: [{name, qty, price}], delivery: {...} }
 * Initializes a Paystack transaction server-side (secret key stays here) and
 * returns the authorization_url for the client to redirect to. The order items
 * and delivery details are attached as metadata.custom_fields so they appear on
 * the customer's Paystack receipt and in the dashboard.
 */
export async function POST(req: NextRequest) {
  let body: { email?: string; amountNaira?: number; items?: PayItem[]; delivery?: Delivery };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const email = (body.email || '').trim();
  const amountNaira = Number(body.amountNaira);
  if (!email || !Number.isFinite(amountNaira) || amountNaira <= 0) {
    return NextResponse.json({ error: 'email and a positive amountNaira are required' }, { status: 400 });
  }

  const items = Array.isArray(body.items) ? body.items : [];
  const d = body.delivery ?? {};

  // Build the receipt/dashboard custom fields. Values are strings per Paystack.
  const orderLines = items
    .map((it) => `${it.qty} × ${it.name} — ₦${(it.qty * it.price).toLocaleString('en-NG')}`)
    .join('\n');
  const custom_fields = [
    { display_name: 'Order Items', variable_name: 'order_items', value: orderLines || '—' },
    { display_name: 'Delivery To', variable_name: 'delivery_to', value: [d.name, d.phone].filter(Boolean).join(' · ') || '—' },
    { display_name: 'Delivery Address', variable_name: 'delivery_address', value: [d.address, d.city, d.state].filter(Boolean).join(', ') || '—' },
  ];
  if (d.notes) {
    custom_fields.push({ display_name: 'Order Notes', variable_name: 'order_notes', value: d.notes });
  }

  // Unique reference per attempt (docs: use a unique id from your system).
  const reference = `ndiidii-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const origin = req.nextUrl.origin;
  const callbackUrl = `${origin}/checkout/callback`;

  try {
    const result = await initializeTransaction({
      email,
      amountNaira,
      reference,
      callbackUrl,
      metadata: { custom_fields },
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Initialize failed' },
      { status: 500 },
    );
  }
}
