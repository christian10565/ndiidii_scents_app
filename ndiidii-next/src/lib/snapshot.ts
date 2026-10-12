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
 *  - Vercel: the project filesystem is read-only at runtime, so writes are
 *    silently skipped (the snapshot can still be committed to the repo and read
 *    as a fallback). To get runtime writes on Vercel, swap save()/load() for
 *    Vercel Blob — same interface.
 */

const SNAPSHOT_PATH = join(process.cwd(), 'data', 'catalog-snapshot.json');

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

  try {
    const raw = await readFile(SNAPSHOT_PATH, 'utf8');
    memoryCache = JSON.parse(raw) as Snapshot<unknown>;
  } catch {
    memoryCache = null; // no file yet — that's fine
  }
  return memoryCache as Snapshot<T> | null;
}

/**
 * Persist a fresh snapshot. Atomic (write to temp, then rename) so a crash
 * mid-write never leaves a truncated file. On a read-only filesystem (Vercel)
 * the write fails and we just skip it — the site still serves fine.
 */
export async function saveSnapshot<T>(snapshot: Snapshot<T>): Promise<void> {
  memoryCache = snapshot; // keep in-process regardless of disk outcome
  try {
    await mkdir(dirname(SNAPSHOT_PATH), { recursive: true });
    const tmp = `${SNAPSHOT_PATH}.${randomUUID()}.tmp`;
    await writeFile(tmp, JSON.stringify(snapshot));
    await rename(tmp, SNAPSHOT_PATH);
  } catch {
    // Read-only FS (Vercel prod) or no data/ dir — non-fatal.
  }
}
