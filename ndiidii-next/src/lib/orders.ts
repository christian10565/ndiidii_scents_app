/**
 * Order + gift-card audit ledger in Vercel KV (Upstash Redis).
 *
 * Every completed order (paid via Paystack, fully-covered by a gift card, or a
 * gift-card purchase) is recorded here so there's a durable, queryable history
 * beyond Paystack's dashboard. Best-effort — a ledger write failure must never
 * block a completed payment.
 *
 * Keys:
 *   orders                 -> list of order JSON (most recent first)
 *   order:<ref>            -> hash of a single order (full detail)
 *   order:pending:<ref>    -> server-priced order awaiting payment (24h TTL)
 *   giftcards:issued       -> list of issued gift-card JSON
 *
 * Env: KV_REST_API_URL, KV_REST_API_TOKEN.
 */
import type { QuoteLine } from './quote';
import { isLive, verifyTransaction } from './paystack';

/** Run a Redis command via the Upstash REST command-array endpoint. */
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

export const isConfigured = (): boolean => Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

export interface OrderItem { name: string; qty: number; price: number }
export interface OrderRecord {
  ref: string;
  at: string;
  email: string;
  items: OrderItem[];
  delivery?: { name?: string; phone?: string; address?: string; city?: string; state?: string; notes?: string };
  amountCharged: number; // what Paystack charged (naira)
  giftCard?: { code: string; amount: number }; // gift-card portion applied
  total: number; // full order value (naira)
  method: 'paystack' | 'giftcard' | 'mixed';
}

/**
 * An order the SERVER priced, waiting for its payment to settle.
 *
 * This is the trust boundary: /api/paystack/initialize writes it after
 * rebuilding the cart from the catalog, and /api/orders/record reads it back
 * instead of trusting whatever the browser posts. Anything not in here never
 * becomes an order.
 */
export interface PendingOrder {
  ref: string;
  at: string;
  email: string;
  lines: QuoteLine[];
  total: number;
  grandTotal: number;
  delivery?: OrderRecord['delivery'];
  giftCard?: { code: string; amount: number };
  method: 'paystack' | 'giftcard' | 'mixed';
}

export async function savePendingOrder(order: PendingOrder): Promise<void> {
  await kv('SET', `order:pending:${order.ref}`, JSON.stringify(order), 'EX', 60 * 60 * 24);
}

/** Read a pending order. Returns null if unknown/expired. */
export async function getPendingOrder(ref: string): Promise<PendingOrder | null> {
  const raw = await kv<string | null>('GET', `order:pending:${ref}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingOrder;
  } catch {
    return null;
  }
}

/** Drop a pending order once it has been finalised (or abandoned). */
export async function deletePendingOrder(ref: string): Promise<void> {
  try {
    await kv('DEL', `order:pending:${ref}`);
  } catch {
    /* non-fatal, the 24h TTL cleans up */
  }
}

/** Record a completed order. Best-effort; never throws to the caller. */
export async function recordOrder(order: OrderRecord): Promise<void> {
  try {
    const json = JSON.stringify(order);
    await kv('LPUSH', 'orders', json);
    await kv('LTRIM', 'orders', 0, 999); // keep the most recent 1000
    await kv('HSET', `order:${order.ref}`, 'json', json, 'at', order.at, 'total', order.total);
  } catch {
    /* ledger write is best-effort — never block a completed payment */
  }
}

/** Record an issued gift card in the issuance ledger. Best-effort. */
export async function recordGiftCardIssued(rec: { code: string; amount: number; at: string; orderRef?: string }): Promise<void> {
  try {
    await kv('LPUSH', 'giftcards:issued', JSON.stringify(rec));
    await kv('LTRIM', 'giftcards:issued', 0, 999);
  } catch {
    /* best-effort */
  }
}

/** Fetch recent orders (most recent first). */
export async function listOrders(limit = 50): Promise<OrderRecord[]> {
  const raw = await kv<string[]>('LRANGE', 'orders', 0, limit - 1);
  return (raw ?? []).map((s) => {
    try {
      return JSON.parse(s) as OrderRecord;
    } catch {
      return null;
    }
  }).filter((o): o is OrderRecord => o !== null);
}

/** Fetch a single order by reference. */
export async function getOrder(ref: string): Promise<OrderRecord | null> {
  const h = await kv<Record<string, string>>('HGETALL', `order:${ref}`);
  // Upstash returns a flat [field, value, ...] array for HGETALL.
  if (Array.isArray(h)) {
    for (let i = 0; i < h.length; i += 2) {
      if (h[i] === 'json') {
        try {
          return JSON.parse(String(h[i + 1])) as OrderRecord;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

/** Outcome of finalising a pending order. */
export interface FinalizeOutcome {
  ok: boolean;
  recorded?: boolean;
  duplicate?: boolean;
  error?: string;
  status?: number;
}

/**
 * Finalise a pending order once its payment is confirmed.
 *
 * Shared by the callback route (/api/orders/record) and the Paystack webhook,
 * so the amount-match check lives in exactly one place. The callback passes no
 * `confirmed` and this verifies via the Paystack API when live; the webhook
 * passes `confirmed` straight from the signed charge.success event (no second
 * verify round-trip). Idempotent: re-finalising an already-recorded reference
 * is a no-op.
 */
export async function finalizeOrder(
  ref: string,
  confirmed?: { status: string; amountNaira: number },
): Promise<FinalizeOutcome> {
  const existing = await getOrder(ref);
  if (existing) return { ok: true, recorded: false, duplicate: true };

  const pending = await getPendingOrder(ref);
  if (!pending) {
    return {
      ok: false,
      error: 'Unknown order reference — it was never priced by this store, or it expired.',
      status: 400,
    };
  }

  const giftAmount = pending.giftCard?.amount ?? 0;
  const expectedCharge = Math.max(0, pending.grandTotal - giftAmount);
  let amountCharged = 0;

  if (pending.method !== 'giftcard') {
    let c = confirmed;
    if (!c && isLive()) {
      try {
        const v = await verifyTransaction(ref);
        c = { status: v.status, amountNaira: v.amountNaira };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : 'Verification failed',
          status: 502,
        };
      }
    }
    if (c) {
      if (c.status !== 'success') {
        return { ok: false, error: `Payment not successful: ${c.status}`, status: 400 };
      }
      amountCharged = c.amountNaira;
      if (Math.abs(amountCharged - expectedCharge) > 0.5) {
        return { ok: false, error: 'Charged amount does not match the priced order.', status: 400 };
      }
    }
  }

  await recordOrder({
    ref,
    at: pending.at,
    email: pending.email,
    items: pending.lines.map((l) => ({ name: `${l.label} — ${l.detail}`, qty: l.qty, price: l.price })),
    delivery: pending.delivery,
    amountCharged,
    giftCard: pending.giftCard,
    total: pending.grandTotal,
    method: pending.method,
  });

  await deletePendingOrder(ref);
  return { ok: true, recorded: true };
}
