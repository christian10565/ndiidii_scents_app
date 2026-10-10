/**
 * Pings the Ndiidii site whenever the sheet is edited, so the shop re-reads the
 * sheet within seconds (the 5-minute revalidate is the fallback).
 *
 * SETUP (once, in the Google Sheet):
 *  1. Extensions -> Apps Script. Paste this file in. Save.
 *  2. Fill in API_URL and SYNC_SECRET below (same secret as SYNC_SECRET in the
 *     site's environment variables).
 *  3. In Apps Script, click the clock icon (Triggers) -> Add Trigger:
 *       function: onSheetEdit | event source: From spreadsheet | event type: On edit
 *     and approve the permissions. (It must be an *installable* trigger: a plain
 *     function named onEdit is not allowed to call external URLs.)
 */
const API_URL = 'https://YOUR-DOMAIN/api/revalidate';
const SYNC_SECRET = 'same-secret-as-in-the-sites-env';

function onSheetEdit() {
  try {
    const res = UrlFetchApp.fetch(API_URL, {
      method: 'post',
      headers: { 'x-sync-secret': SYNC_SECRET },
      muteHttpExceptions: true,
    });
    // Surface failures instead of swallowing them — a silent missed sync is worse
    // than a visible one.
    if (res.getResponseCode() >= 400) {
      console.error('Sync ping failed (' + res.getResponseCode() + '): ' + res.getContentText());
    }
  } catch (err) {
    console.error('Sync ping failed: ' + err);
  }
}
