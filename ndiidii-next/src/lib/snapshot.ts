import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';

/**
 * Local catalog snapshot — the safety net when the live Google Sheet read fails.
 *
 * On every successful sheet read we persist the mapped catalog here. When a read
 * fails (sheet deleted, service account revoked, network down), we serve the last
 * good snapshot instead of an empty catalog, so the site degrades to "slightly
 * stale" rather than "blank".
 *
 * Hosting notes:
 *  - cPanel / VPS / Docker / Railway: the file persists, this works as-is in prod.
 *  - Vercel: the project filesystem is read-only at runtime, so local writes are
 *    silently skipped. To persist snapshots on Vercel, set KV_REST_API_URL and
 *    KV_REST_API_TOKEN (Vercel KV / Upstash) — save/load then use Redis with the
 *    same interface.
 */

const SNAPSHOT_PATH = join(process.cwd(), 'data', 'catalog-snapshot.json');
const KV_KEY = 'catalog:snapshot';

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

/** True when Redis-backed snapshot persistence is available (Vercel KV / Upstash). */
const kvEnabled = (): boolean => Boolean(KV_URL && KV_TOKEN);

/** Run a Redis command via the Upstash REST command-array endpoint. */
async function kv<T = unknown>(...args: (string | number)[]): Promise<T> {
  const res = await fetch(KV_URL as string, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args.map((a) => String(a))),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.result as T;
}

export interface Snapshot<T> {
  savedAt: string;
  perfumes: T[];
  oils: unknown[];
}

let memoryCache: Snapshot<unknown> | null | undefined;

/** Read the last good snapshot, or null if none exists yet. */
export async function loadSnapshot<T>(): Promise<Snapshot<T> | null> {
  // Prefer the in-process cache (avoids a disk read on every request).
  if (memoryCache !== undefined) return memoryCache as Snapshot<T> | null;

  // Redis (Vercel) — preferred when configured.
  if (kvEnabled()) {
    try {
      const raw = await kv<string | null>('GET', KV_KEY);
      memoryCache = raw ? (JSON.parse(raw) as Snapshot<unknown>) : null;
      return memoryCache as Snapshot<T> | null;
    } catch {
      // fall through to local file
    }
  }

  try {
    const raw = await readFile(SNAPSHOT_PATH, 'utf8');
    memoryCache = JSON.parse(raw) as Snapshot<unknown>;
  } catch {
    memoryCache = null; // no file yet — that's fine
  }
  return memoryCache as Snapshot<T> | null;
}

/**
 * Persist a fresh snapshot. Local path is atomic (write to temp, then rename) so
 * a crash mid-write never leaves a truncated file. On a read-only filesystem
 * (Vercel prod) the local write fails and we just skip it — but if Redis is
 * configured we still persist there.
 */
export async function saveSnapshot<T>(snapshot: Snapshot<T>): Promise<void> {
  memoryCache = snapshot; // keep in-process regardless of disk outcome

  // Redis (Vercel KV / Upstash) — persists across deploys and read-only FS.
  if (kvEnabled()) {
    try {
      await kv('SET', KV_KEY, JSON.stringify(snapshot));
    } catch {
      /* Redis failure is non-fatal */
    }
  }

  try {
    await mkdir(dirname(SNAPSHOT_PATH), { recursive: true });
    const tmp = `${SNAPSHOT_PATH}.${randomUUID()}.tmp`;
    await writeFile(tmp, JSON.stringify(snapshot));
    await rename(tmp, SNAPSHOT_PATH);
  } catch {
    // Read-only FS (Vercel prod) or no data/ dir — non-fatal.
  }
}
