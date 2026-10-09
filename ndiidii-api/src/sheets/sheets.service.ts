import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';

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

@Injectable()
export class SheetsService {
  private readonly log = new Logger(SheetsService.name);

  constructor(private readonly config: ConfigService) {}

  private client() {
    const auth = new google.auth.JWT({
      email: this.config.getOrThrow<string>('GOOGLE_SERVICE_ACCOUNT_EMAIL'),
      key: this.config.getOrThrow<string>('GOOGLE_PRIVATE_KEY').replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    return google.sheets({ version: 'v4', auth });
  }

  /** Reads one tab. Row 1 is treated as the header row. Fully blank rows are dropped. */
  async readTab(tabName: string): Promise<SheetRow[]> {
    const spreadsheetId = this.config.getOrThrow<string>('GOOGLE_SHEET_ID');
    const range = `'${tabName.replace(/'/g, "''")}'`;

    const res = await this.client().spreadsheets.values.get({
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

    this.log.log(`Read ${rows.length} rows from "${tabName}"`);
    return rows;
  }
}
