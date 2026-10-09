import {
  Column,
  CreateDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type Gender = 'men' | 'women' | 'unisex';

/** Columns shared by perfumes and perfume oils. */
export abstract class CatalogBase {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** The ID from the first column of the spreadsheet. This is how a sheet row is matched to a DB row. */
  @Column({ unique: true })
  sheetId!: string;

  /** URL-friendly name, fixed when the product is first created. */
  @Column({ unique: true })
  slug!: string;

  /** Row position in the sheet, so "Featured" sorting follows the sheet order. */
  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @Column()
  name!: string;

  @Column({ type: 'varchar', nullable: true })
  brand!: string | null;

  @Column({ type: 'varchar', nullable: true })
  gender!: Gender | null;

  @Column({ type: 'varchar', nullable: true })
  imageUrl!: string | null;

  /** Live stock. The database is the source of truth once orders start deducting from it. */
  @Column({ type: 'int', default: 0 })
  stock!: number;

  /** The last Stock value we read from the sheet — used to detect when she edits it. */
  @Column({ type: 'int', nullable: true })
  lastSheetStock!: number | null;

  /** false = removed from (or blanked in) the sheet; hidden from the shop but kept for old orders. */
  @Column({ default: true })
  active!: boolean;

  /** Any sheet columns we don't map explicitly are kept here, so nothing she adds is lost. */
  @Column({ type: 'jsonb', default: () => "'{}'" })
  extra!: Record<string, string>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
