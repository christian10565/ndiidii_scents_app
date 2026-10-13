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
 *   giftcards:issued       -> list of issued gift-card JSON
 *
 * Env: KV_REST_API_URL, KV_REST_API_TOKEN.
 */

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
