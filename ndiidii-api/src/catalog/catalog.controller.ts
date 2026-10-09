import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  BOX_SIZE,
  NIGERIA_STATES,
  OIL_BOX_PRICE_NGN,
  TIER_BOX_PRICE_NGN,
} from '../config/store.config';
import { ListOilsQuery, ListPerfumesQuery } from './catalog.dto';
import { CatalogService } from './catalog.service';

@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('health')
  health() {
    return { ok: true };
  }

  /** Business rules the React app needs: box size, tier prices, the State dropdown. */
  @Get('config')
  config() {
    return {
      boxSize: BOX_SIZE,
      tierBoxPrice: TIER_BOX_PRICE_NGN,
      oilBoxPrice: OIL_BOX_PRICE_NGN,
      states: NIGERIA_STATES,
    };
  }

  @Get('perfumes')
  perfumes(@Query() q: ListPerfumesQuery) {
    return this.catalog.listPerfumes(q);
  }

  @Get('perfumes/:slug')
  perfume(@Param('slug') slug: string) {
    return this.catalog.getPerfume(slug);
  }

  @Get('oils')
  oils(@Query() q: ListOilsQuery) {
    return this.catalog.listOils(q);
  }

  @Get('oils/:slug')
  oil(@Param('slug') slug: string) {
    return this.catalog.getOil(slug);
  }

  @Get('brands')
  brands() {
    return this.catalog.listBrands();
  }
}
