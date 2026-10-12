import { google } from 'googleapis';

/**
 * Reads the client's Google Sheet. Runs SERVER-SIDE ONLY — never import this
 * into a client component (the service account key must not reach the browser).
 */

export interface SheetRow {
  /** Value of the first column (the ID column — its header is blank or odd in her sheets). */
  first: string;
  /** Cells keyed by NORMALISED header (lowercase, letters and digits only). */
  cells: Record<string, string>;
  /** Cells keyed by the ORIGINAL header text, used to keep unmapped columns. */
  raw: Record<string, string>;
  /** 1-based row number in the sheet, for error messages. */
  rowNumber: number;
}

export const normaliseHeader = (h: string): string =>
  h.toLowerCase().replace(/[^a-z0-9]/g, '');

let sheetsClient: ReturnType<typeof google.sheets> | null = null;

function client() {
  if (sheetsClient) return sheetsClient;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !key) {
    throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY');
  }
  const auth = new google.auth.JWT({
    email,
    key: key.replace(/\\n/g, '\n'),
    // Read+write: the site reads the sheet, and the image-pipeline scripts
    // write Cloudinary URLs back into the Image column.
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  // Built once and reused. The auth client caches its own access token
  // internally and refreshes it only when it expires, so rebuilding the
  // client per call just repeats the token handshake (~1-2s each time).
  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
}

/** Reads one tab. Row 1 is treated as the header row. Fully blank rows are dropped. */
export async function readTab(tabName: string): Promise<SheetRow[]> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) {
    throw new Error('Missing GOOGLE_SHEET_ID');
  }
  const range = `'${tabName.replace(/'/g, "''")}'`;

  const res = await client().spreadsheets.values.get({
    spreadsheetId,
    range,
    valueRenderOption: 'FORMATTED_VALUE',
  });

  const values = res.data.values ?? [];
  if (values.length < 2) return [];

  const headers = (values[0] as unknown[]).map((h) => String(h ?? '').trim());
  const rows: SheetRow[] = [];

  for (let i = 1; i < values.length; i++) {
    const line = (values[i] ?? []) as unknown[];
    const cells: Record<string, string> = {};
    const raw: Record<string, string> = {};
    let anyValue = false;

    headers.forEach((header, col) => {
      const value = String(line[col] ?? '').trim();
      if (value) anyValue = true;
      if (col === 0) return; // first column is the ID, handled separately
      if (!header) return;
      cells[normaliseHeader(header)] = value;
      raw[header] = value;
    });

    if (!anyValue) continue;
    rows.push({ first: String(line[0] ?? '').trim(), cells, raw, rowNumber: i + 1 });
  }

  return rows;
}
