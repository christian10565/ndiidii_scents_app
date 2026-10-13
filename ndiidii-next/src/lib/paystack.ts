/**
 * Paystack integration (Redirect flow).
 * Docs: https://paystack.com/docs/payments/accept-payments/#redirect
 *
 * Flow:
 *   1. Client POSTs the cart + customer email to /api/paystack/initialize.
 *   2. Server calls Paystack's Initialize Transaction endpoint with the SECRET
 *      key (never exposed to the frontend) and returns the authorization_url.
 *   3. Client redirects the customer to that hosted checkout.
 *   4. Paystack redirects back to our callback_url with ?reference=...
 *   5. /api/paystack/verify calls the Verify endpoint server-side, checks
 *      data.status === 'success' AND data.amount matches, then we deliver.
 *
 * MOCK MODE: when PAYSTACK_SECRET_KEY is unset (or 'test'), initialize returns
 * a local mock checkout URL so the whole flow is clickable before real keys
 * exist. Flipping to live is just setting the env var — no code change.
 */

const PAYSTACK_BASE = 'https://api.paystack.co';

/** True when we should hit the real Paystack API (a real secret key is present). */
export const isLive = (): boolean => {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) return false;
  if (key === 'REPLACE_ME') return false; // placeholder from .env.example
  if (key.startsWith('sk_test_xxx')) return false; // obvious placeholder
  return true;
};

/**
 * Convert naira to kobo (Paystack's subunit). Their docs: amount must be in the
 * lower denomination of the currency — NGN → multiply by 100.
 */
export const toKobo = (naira: number): number => Math.round(naira * 100);

/** Convert kobo back to naira. */
export const fromKobo = (kobo: number): number => kobo / 100;

export interface InitializeResult {
  authorization_url: string;
  reference: string;
  mock: boolean;
}

/**
 * Initialize a transaction. Server-side only — uses the secret key.
 * Returns the hosted checkout URL to redirect the customer to.
 */
export async function initializeTransaction(opts: {
  email: string;
  amountNaira: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}): Promise<InitializeResult> {
  const amount = toKobo(opts.amountNaira);

  // MOCK MODE — no real key yet. Route to a local mock checkout page that
  // simulates Paystack's hosted page and redirects back with a reference.
  if (!isLive()) {
    const url = new URL('/checkout/mock', 'http://localhost');
    url.searchParams.set('reference', opts.reference);
    url.searchParams.set('amount', String(opts.amountNaira));
    url.searchParams.set('callback', opts.callbackUrl);
    return { authorization_url: url.pathname + url.search, reference: opts.reference, mock: true };
  }

  const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: opts.email,
      amount, // in kobo
      reference: opts.reference,
      callback_url: opts.callbackUrl,
      metadata: opts.metadata,
    }),
  });
  const json = await res.json();
  if (!json.status) {
    throw new Error(json.message || 'Paystack initialize failed');
  }
  return {
    authorization_url: json.data.authorization_url,
    reference: json.data.reference,
    mock: false,
  };
}

export interface VerifyResult {
  status: string; // 'success' | 'failed' | ...
  amountNaira: number;
  reference: string;
  mock: boolean;
}

/**
 * Verify a transaction server-side. Docs: https://paystack.com/docs/payments/verify-payments/
 * Caller MUST check status === 'success' AND amount matches the order before
 * delivering value.
 */
export async function verifyTransaction(reference: string): Promise<VerifyResult> {
  // MOCK MODE — treat any mock reference as a successful payment.
  if (!isLive()) {
    return { status: 'success', amountNaira: 0, reference, mock: true };
  }

  const res = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
  });
  const json = await res.json();
  if (!json.status) {
    throw new Error(json.message || 'Paystack verify failed');
  }
  return {
    status: json.data.status,
    amountNaira: fromKobo(json.data.amount),
    reference: json.data.reference,
    mock: false,
  };
}
