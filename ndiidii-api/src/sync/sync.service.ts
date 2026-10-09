import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { CatalogBase } from '../catalog/catalog-base.entity';
import { PerfumeOil } from '../catalog/oil.entity';
import { Perfume } from '../catalog/perfume.entity';
import { SheetsService } from '../sheets/sheets.service';
import { MappedOil, MappedPerfume, mapOilRow, mapPerfumeRow } from './mappers';

export interface TabReport {
  tab: string;
  rowsRead: number;
  created: number;
  updated: number;
  deactivated: number;
  warnings: string[];
  error?: string;
}

export interface SyncReport {
  startedAt: string;
  finishedAt: string;
  perfumes: TabReport;
  oils: TabReport;
}

interface MappedCommon {
  sheetId: string;
  slugBase: string;
  sortOrder: number;
  sheetStock: number | null;
}

@Injectable()
export class SyncService {
  private readonly log = new Logger(SyncService.name);
  private running: Promise<SyncReport> | null = null;
  private rerunRequested = false;
  private debounceTimer: NodeJS.Timeout | null = null;
  lastReport: SyncReport | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly sheets: SheetsService,
    @InjectRepository(Perfume) private readonly perfumes: Repository<Perfume>,
    @InjectRepository(PerfumeOil) private readonly oils: Repository<PerfumeOil>,
  ) {}

  /** Safety net: even if the sheet's edit trigger fails, the site catches up within 10 minutes. */
  @Cron('*/10 * * * *')
  async scheduledSync() {
    try {
      await this.run();
    } catch (e) {
      this.log.error(`Scheduled sync failed: ${(e as Error).message}`);
    }
  }

  /** Called by the webhook. Waits a few seconds so a burst of edits becomes one sync. */
  requestDebouncedSync(delayMs = 15_000) {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.run().catch((e) => this.log.error(`Webhook sync failed: ${e.message}`));
    }, delayMs);
  }

  /** Runs a sync. If one is already running, another is queued right after it. */
  async run(): Promise<SyncReport> {
    if (this.running) {
      this.rerunRequested = true;
      return this.running;
    }
    this.running = this.doSync();
    try {
      return await this.running;
    } finally {
      this.running = null;
      if (this.rerunRequested) {
        this.rerunRequested = false;
        this.run().catch((e) => this.log.error(`Queued sync failed: ${e.message}`));
      }
    }
  }

  private async doSync(): Promise<SyncReport> {
    const startedAt = new Date().toISOString();
    const perfumeTab = this.config.get<string>('PERFUME_TAB', 'Perfumes');
    const oilTab = this.config.get<string>('OIL_TAB', 'Perfume Oils');

    const perfumes = await this.syncTab<Perfume, MappedPerfume>(
      perfumeTab,
      this.perfumes,
      mapPerfumeRow,
      (e, m) => {
        e.scentProfile = m.scentProfile;
        e.inspiredBy = m.inspiredBy;
        e.topNotes = m.topNotes;
        e.heartNotes = m.heartNotes;
        e.baseNotes = m.baseNotes;
        e.description = m.description;
        e.tier = m.tier;
      },
      // Every perfume must have a tier — a box can't be built without one.
      (m) =>
        m.tier ? null : `"${m.name}" has no tier, so it can't be added to a box. Set Tier 1, 2 or 3 in the sheet.`,
    );

    const oils = await this.syncTab<PerfumeOil, MappedOil>(
      oilTab,
      this.oils,
      mapOilRow,
      (e, m) => {
        e.category = m.category;
      },
    );

    const report: SyncReport = {
      startedAt,
      finishedAt: new Date().toISOString(),
      perfumes,
      oils,
    };
    this.lastReport = report;
    this.log.log(
      `Sync done — perfumes: +${perfumes.created} ~${perfumes.updated} -${perfumes.deactivated}` +
        `, oils: +${oils.created} ~${oils.updated} -${oils.deactivated}`,
    );
    return report;
  }

  /** Reads one tab and upserts it into one table. Errors in one tab never block the other. */
  private async syncTab<
    T extends CatalogBase,
    M extends MappedCommon & {
      name?: string;
      brand?: string | null;
      gender?: CatalogBase['gender'];
      imageUrl?: string | null;
      extra?: Record<string, string>;
    },
  >(
    tab: string,
    repo: Repository<T>,
    mapRow: (row: import('../sheets/sheets.service').SheetRow, index: number) => M | null,
    applySpecific: (entity: T, mapped: M) => void,
    validate?: (mapped: M) => string | null,
  ): Promise<TabReport> {
    const report: TabReport = {
      tab,
      rowsRead: 0,
      created: 0,
      updated: 0,
      deactivated: 0,
      warnings: [],
    };

    try {
      const rows = await this.sheets.readTab(tab);
      report.rowsRead = rows.length;

      const mapped: M[] = [];
      rows.forEach((row, i) => {
        const m = mapRow(row, i);
        if (m) {
          mapped.push(m);
          const problem = validate?.(m);
          if (problem) report.warnings.push(`Row ${row.rowNumber}: ${problem}`);
        } else report.warnings.push(`Row ${row.rowNumber}: no name, skipped`);
      });

      // Safety: an empty read (wrong tab name, sheet cleared by mistake) must never wipe the shop.
      if (mapped.length === 0) {
        report.warnings.push('No usable rows found — nothing changed.');
        return report;
      }

      const existing = await repo.find();
      const bySheetId = new Map(existing.map((e) => [e.sheetId, e]));
      const usedSlugs = new Set(existing.map((e) => e.slug));
      const seen = new Set<string>();
      const toSave: T[] = [];
      const defaultStock = Number(this.config.get('DEFAULT_STOCK', 0)) || 0;

      for (const m of mapped) {
        if (seen.has(m.sheetId)) {
          report.warnings.push(`Duplicate ID "${m.sheetId}" (${m.name}) — skipped. IDs must be unique.`);
          continue;
        }
        seen.add(m.sheetId);

        let entity = bySheetId.get(m.sheetId);
        if (!entity) {
          entity = repo.create({
            sheetId: m.sheetId,
            slug: this.uniqueSlug(m.slugBase || m.sheetId, usedSlugs),
            stock: m.sheetStock ?? defaultStock,
            lastSheetStock: m.sheetStock,
            active: true,
          } as unknown as DeepPartial<T>);
          report.created++;
        } else {
          report.updated++;
        }

        entity.sortOrder = m.sortOrder;
        entity.name = m.name ?? entity.name;
        entity.brand = m.brand ?? null;
        entity.gender = m.gender ?? null;
        entity.imageUrl = m.imageUrl ?? null;
        entity.extra = m.extra ?? {};
        entity.active = true;
        applySpecific(entity, m);

        // Stock rule: the sheet only overrides live stock when she CHANGES the number there.
        // Otherwise the sheet's (old) number would undo every sale the site has made.
        if (m.sheetStock !== null && m.sheetStock !== entity.lastSheetStock) {
          entity.stock = m.sheetStock;
          entity.lastSheetStock = m.sheetStock;
        }

        toSave.push(entity);
      }

      await repo.save(toSave as any, { chunk: 100 });

      // Rows removed from the sheet are hidden, not deleted (old orders still point at them).
      const gone = existing.filter((e) => e.active && !seen.has(e.sheetId));
      if (gone.length) {
        gone.forEach((e) => (e.active = false));
        await repo.save(gone as any, { chunk: 100 });
        report.deactivated = gone.length;
      }
    } catch (e) {
      report.error = (e as Error).message;
      this.log.error(`Sync of "${tab}" failed: ${report.error}`);
    }

    return report;
  }

  private uniqueSlug(base: string, used: Set<string>): string {
    let slug = base || 'item';
    let n = 2;
    while (used.has(slug)) slug = `${base}-${n++}`;
    used.add(slug);
    return slug;
  }
}
