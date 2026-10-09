import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PerfumeOil } from './catalog/oil.entity';
import { Perfume } from './catalog/perfume.entity';
import { CatalogModule } from './catalog/catalog.module';
import { SyncModule } from './sync/sync.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        url: config.getOrThrow<string>('DATABASE_URL'),
        ssl: config.get('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
        entities: [Perfume, PerfumeOil],
        // Auto-creates tables while building. Before going live, switch to migrations.
        synchronize: config.get('DB_SYNC', 'true') === 'true',
      }),
    }),
    CatalogModule,
    SyncModule,
  ],
})
export class AppModule {}
