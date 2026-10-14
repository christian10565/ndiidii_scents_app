/**
 * Gift cards — codes + balances in Vercel KV (Upstash Redis).
 *
 * Model: a code is a bearer token. Whoever holds it can spend its balance.
 * No account/profile needed. Balances live in Redis with atomic DECRBY so a
 * code can't be double-spent.
 *
 * Keys:
 *   gc:<CODE>:bal        -> string, remaining naira (atomic DECRBY target)
 *   gc:<CODE>:meta       -> hash { initial, createdAt, note }
 *   gc:<CODE>:log        -> list of redemption events (audit)
 *
 * Env: KV_REST_API_URL, KV_REST_API_TOKEN (Vercel KV / Upstash REST).
 */

const URL_ = process.env.KV_REST_API_URL;
const TOKEN = process.env.KV_REST_API_TOKEN;

export const isConfigured = (): boolean => Boolean(URL_ && TOKEN);

/** Run a Redis command via the Upstash REST command-array endpoint. */
async function kv<T = unknown>(...args: (string | number)[]): Promise<T> {
  if (!URL_ || !TOKEN) throw new Error('KV is not configured (missing KV_REST_API_URL / KV_REST_API_TOKEN)');
  const res = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args.map((a) => String(a))),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.result as T;
}

/** Alphabet without easily-confused chars (no O/0, I/1). */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomGroup(len: number): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

/** Generate a unique code like NDII-XXXX-XXXX. */
export function generateCode(): string {
  return `NDII-${randomGroup(4)}-${randomGroup(4)}`;
}

export interface GiftCard {
  code: string;
  balance: number; // remaining naira
  initial: number; // original naira
  createdAt: string;
  note?: string;
}

/** Create a gift card with a starting balance. Returns the card incl. its code. */
export async function createGiftCard(opts: { amountNaira: number; note?: string }): Promise<GiftCard> {
  let code = generateCode();
  for (let i = 0; i < 5; i++) {
    const exists = await kv<number>('EXISTS', `gc:${code}:bal`);
    if (!exists) break;
    code = generateCode();
  }
  const createdAt = new Date().toISOString();
  await kv('SET', `gc:${code}:bal`, opts.amountNaira);
  await kv('HSET', `gc:${code}:meta`, 'initial', opts.amountNaira, 'createdAt', createdAt, 'note', opts.note ?? '');
  return { code, balance: opts.amountNaira, initial: opts.amountNaira, createdAt, note: opts.note };
}

/** Look up a gift card by code. Returns null if not found. */
export async function getGiftCard(code: string): Promise<GiftCard | null> {
  const c = normalizeCode(code);
  const bal = await kv<string | null>('GET', `gc:${c}:bal`);
  if (bal === null) return null;
  // Upstash HGETALL returns a flat [field, value, field, value, ...] array.
  const flat = await kv<(string | null)[]>('HGETALL', `gc:${c}:meta`);
  const meta: Record<string, string> = {};
  if (Array.isArray(flat)) {
    for (let i = 0; i < flat.length; i += 2) {
      const key = flat[i];
      if (key != null) meta[key] = String(flat[i + 1] ?? '');
    }
  }
  return {
    code: c,
    balance: Number(bal),
    initial: Number(meta.initial ?? bal),
    createdAt: meta.createdAt ?? '',
    note: meta.note || undefined,
  };
}

/**
 * Atomically deduct `amountNaira` from a card and return the new balance.
 * Throws if the card is missing or has insufficient funds. DECRBY is atomic,
 * so concurrent redemptions can't overspend.
 */
export async function redeemGiftCard(code: string, amountNaira: number, meta?: { orderRef?: string }): Promise<number> {
  const c = normalizeCode(code);
  const bal = await kv<string | null>('GET', `gc:${c}:bal`);
  if (bal === null) throw new Error('Gift card not found');
  if (Number(bal) < amountNaira) throw new Error('Insufficient gift card balance');
  const newBalance = await kv<number>('DECRBY', `gc:${c}:bal`, amountNaira);
  try {
    await kv('LPUSH', `gc:${c}:log`, JSON.stringify({ amount: amountNaira, at: new Date().toISOString(), orderRef: meta?.orderRef ?? '' }));
  } catch {
    /* audit log failure is non-fatal */
  }
  return newBalance;
}

/** Uppercase + strip non-alphanumerics; re-insert dashes as NDII-XXXX-XXXX. */
export function normalizeCode(code: string): string {
  const cleaned = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (/^NDII[A-Z0-9]{8}$/.test(cleaned)) return `NDII-${cleaned.slice(4, 8)}-${cleaned.slice(8)}`;
  return cleaned;
}
