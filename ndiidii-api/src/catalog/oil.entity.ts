import { Column, Entity, Index } from 'typeorm';
import { CatalogBase } from './catalog-base.entity';

export type OilCategory = 'designer' | 'niche';

@Entity('perfume_oils')
export class PerfumeOil extends CatalogBase {
  /** "Designer" or "High end" in the sheet (shown as "Niche / High End" on the site). */
  @Index()
  @Column({ type: 'varchar', nullable: true })
  category!: OilCategory | null;
}
