import {
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { SyncService } from './sync.service';

@Controller('sync')
export class SyncController {
  constructor(
    private readonly sync: SyncService,
    private readonly config: ConfigService,
  ) {}

  private assertSecret(provided?: string) {
    const expected = this.config.getOrThrow<string>('SYNC_SECRET');
    const a = Buffer.from(provided ?? '');
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException();
    }
  }

  /** Called by the Google Apps Script whenever the sheet is edited. Returns at once; the sync runs ~15s later. */
  @Post('webhook')
  @HttpCode(202)
  webhook(@Headers('x-sync-secret') secret?: string) {
    this.assertSecret(secret);
    this.sync.requestDebouncedSync();
    return { queued: true };
  }

  /** Manual "sync now" and wait for the result. Handy while testing: curl -X POST -H "x-sync-secret: ..." */
  @Post('now')
  async now(@Headers('x-sync-secret') secret?: string) {
    this.assertSecret(secret);
    return this.sync.run();
  }

  /** Report from the most recent sync (what was created, updated, skipped, and why). */
  @Get('status')
  status(@Headers('x-sync-secret') secret?: string) {
    this.assertSecret(secret);
    return this.sync.lastReport ?? { message: 'No sync has run yet.' };
  }
}
