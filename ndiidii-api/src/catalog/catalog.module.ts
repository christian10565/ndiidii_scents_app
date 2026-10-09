import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { PerfumeOil } from './oil.entity';
import { Perfume } from './perfume.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Perfume, PerfumeOil])],
  controllers: [CatalogController],
  providers: [CatalogService],
  exports: [CatalogService, TypeOrmModule],
})
export class CatalogModule {}
