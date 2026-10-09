import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PerfumeOil } from '../catalog/oil.entity';
import { Perfume } from '../catalog/perfume.entity';
import { SheetsService } from '../sheets/sheets.service';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';

@Module({
  imports: [TypeOrmModule.forFeature([Perfume, PerfumeOil])],
  controllers: [SyncController],
  providers: [SyncService, SheetsService],
  exports: [SyncService],
})
export class SyncModule {}
