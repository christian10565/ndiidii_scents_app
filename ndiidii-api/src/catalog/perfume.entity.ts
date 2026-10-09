import { Column, Entity, Index } from 'typeorm';
import { CatalogBase } from './catalog-base.entity';

@Entity('perfumes')
export class Perfume extends CatalogBase {
  /** Short scent family shown above the name on cards, e.g. "Vanilla", "Aquatic". */
  @Column({ type: 'varchar', nullable: true })
  scentProfile!: string | null;

  @Column({ type: 'varchar', nullable: true })
  inspiredBy!: string | null;

  @Column({ type: 'text', nullable: true })
  topNotes!: string | null;

  @Column({ type: 'text', nullable: true })
  heartNotes!: string | null;

  @Column({ type: 'text', nullable: true })
  baseNotes!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  /** 1, 2 or 3. A Tier 2 perfume can only go into a Tier 2 box. */
  @Index()
  @Column({ type: 'smallint', nullable: true })
  tier!: 1 | 2 | 3 | null;
}
