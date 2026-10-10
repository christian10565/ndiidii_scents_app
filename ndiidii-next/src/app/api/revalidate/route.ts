import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

/**
 * Called by the Google Apps Script whenever the sheet is edited.
 * The sheet sends the shared secret in the x-sync-secret header.
 * Invalidates the catalog cache so the next request re-reads the sheet.
 *
 * The 5-minute cacheLife window is the fallback; this ping makes updates feel instant.
 */
export async function POST(request: Request) {
  const secret = request.headers.get('x-sync-secret');
  const expected = process.env.SYNC_SECRET;

  if (!expected || secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // expire: 0 = never serve stale — the next request blocks until fresh, so an
  // edited sheet shows up immediately (not after the 5-minute window).
  revalidateTag('catalog', { expire: 0 });
  return NextResponse.json({ revalidated: true });
}
