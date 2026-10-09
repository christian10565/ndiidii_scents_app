/**
 * Pings the Ndiidii API whenever the sheet is edited, so the site updates within ~20 seconds.
 *
 * SETUP (once, in the Google Sheet):
 *  1. Extensions -> Apps Script. Paste this file in. Save.
 *  2. Fill in API_URL and SYNC_SECRET below (same secret as SYNC_SECRET in the API's .env).
 *  3. In Apps Script, click the clock icon (Triggers) -> Add Trigger:
 *       function: onSheetEdit | event source: From spreadsheet | event type: On edit
 *     and approve the permissions. (It must be an *installable* trigger: a plain
 *     function named onEdit is not allowed to call external URLs.)
 */
const API_URL = 'https://YOUR-API-DOMAIN/api/sync/webhook';
const SYNC_SECRET = 'same-secret-as-in-the-api-env';

function onSheetEdit() {
  try {
    UrlFetchApp.fetch(API_URL, {
      method: 'post',
      headers: { 'x-sync-secret': SYNC_SECRET },
      muteHttpExceptions: true,
    });
  } catch (err) {
    console.error('Sync ping failed: ' + err);
  }
}
