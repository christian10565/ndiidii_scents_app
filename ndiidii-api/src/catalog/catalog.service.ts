import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectLiteral, Repository, SelectQueryBuilder } from 'typeorm';
import { ListOilsQuery, ListPerfumesQuery } from './catalog.dto';
import { CatalogBase } from './catalog-base.entity';
import { PerfumeOil } from './oil.entity';
import { Perfume } from './perfume.entity';

/** "a, b,c" -> ['a','b','c'] (empty/undefined -> []). */
const splitList = (v?: string): string[] =>
  (v ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

const publicBase = (e: CatalogBase) => ({
  id: e.id,
  slug: e.slug,
  name: e.name,
  brand: e.brand,
  gender: e.gender,
  imageUrl: e.imageUrl,
  stock: e.stock,
  inStock: e.stock > 0,
});

export const toPublicPerfume = (p: Perfume) => ({
  ...publicBase(p),
  tier: p.tier,
  scentProfile: p.scentProfile,
  inspiredBy: p.inspiredBy,
  notes: { top: p.topNotes, heart: p.heartNotes, base: p.baseNotes },
  description: p.description,
});

export const toPublicOil = (o: PerfumeOil) => ({
  ...publicBase(o),
  category: o.category,
});

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(Perfume) private readonly perfumes: Repository<Perfume>,
    @InjectRepository(PerfumeOil) private readonly oils: Repository<PerfumeOil>,
  ) {}

  /** Filters and sorting shared by perfumes and oils. */
  private applyCommon<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    a: string,
    q: ListPerfumesQuery | ListOilsQuery,
  ) {
    qb.where(`${a}.active = true`);

    const genders = splitList(q.gender)
      .map((g) => g.toLowerCase())
      .filter((g) => ['men', 'women', 'unisex'].includes(g));
    if (genders.length) qb.andWhere(`${a}.gender IN (:...genders)`, { genders });

    if (q.inStock === true) qb.andWhere(`${a}.stock > 0`);
    else if (q.inStock === false) qb.andWhere(`${a}.stock <= 0`);
    const brands = splitList(q.brand).map((b) => b.toLowerCase());
    if (brands.length) qb.andWhere(`LOWER(${a}.brand) IN (:...brands)`, { brands });
    if (q.q?.trim()) {
      qb.andWhere(`(${a}.name ILIKE :search OR ${a}.brand ILIKE :search)`, {
        search: `%${q.q.trim()}%`,
      });
    }

    if (q.sort === 'name') qb.orderBy(`${a}.name`, 'ASC');
    else if (q.sort === 'newest') qb.orderBy(`${a}.createdAt`, 'DESC');
    else qb.orderBy(`${a}.sortOrder`, 'ASC'); // featured = the order she keeps in the sheet

    qb.addOrderBy(`${a}.id`, 'ASC'); // stable pagination
    qb.skip((q.page - 1) * q.limit).take(q.limit);
  }

  async listPerfumes(q: ListPerfumesQuery): Promise<Paged<ReturnType<typeof toPublicPerfume>>> {
    const qb = this.perfumes.createQueryBuilder('p');
    this.applyCommon(qb, 'p', q);
    const tiers = splitList(q.tier)
      .map(Number)
      .filter((t) => t === 1 || t === 2 || t === 3);
    if (tiers.length) qb.andWhere('p.tier IN (:...tiers)', { tiers });
    const [rows, total] = await qb.getManyAndCount();
    return { items: rows.map(toPublicPerfume), total, page: q.page, limit: q.limit };
  }

  async getPerfume(slug: string) {
    const p = await this.perfumes.findOne({ where: { slug, active: true } });
    if (!p) throw new NotFoundException('Perfume not found');
    return toPublicPerfume(p);
  }

  async listOils(q: ListOilsQuery): Promise<Paged<ReturnType<typeof toPublicOil>>> {
    const qb = this.oils.createQueryBuilder('o');
    this.applyCommon(qb, 'o', q);
    if (q.category) qb.andWhere('o.category = :category', { category: q.category });
    const [rows, total] = await qb.getManyAndCount();
    return { items: rows.map(toPublicOil), total, page: q.page, limit: q.limit };
  }

  async getOil(slug: string) {
    const o = await this.oils.findOne({ where: { slug, active: true } });
    if (!o) throw new NotFoundException('Oil not found');
    return toPublicOil(o);
  }

  /** Brands A–Z page and the Brand filter in the Shop sidebar. */
  async listBrands() {
    const fromTable = async (repo: Repository<CatalogBase & ObjectLiteral>, alias: string) =>
      repo
        .createQueryBuilder(alias)
        .select(`${alias}.brand`, 'brand')
        .addSelect('COUNT(*)', 'count')
        .where(`${alias}.active = true AND ${alias}.brand IS NOT NULL`)
        .groupBy(`${alias}.brand`)
        .getRawMany<{ brand: string; count: string }>();

    const [pr, or] = await Promise.all([
      fromTable(this.perfumes as Repository<any>, 'p'),
      fromTable(this.oils as Repository<any>, 'o'),
    ]);

    const merged = new Map<string, { brand: string; perfumes: number; oils: number }>();
    const key = (b: string) => b.trim().toLowerCase();
    for (const r of pr) {
      const k = key(r.brand);
      merged.set(k, { brand: r.brand, perfumes: Number(r.count), oils: merged.get(k)?.oils ?? 0 });
    }
    for (const r of or) {
      const k = key(r.brand);
      const cur = merged.get(k);
      merged.set(k, { brand: cur?.brand ?? r.brand, perfumes: cur?.perfumes ?? 0, oils: Number(r.count) });
    }

    return [...merged.values()].sort((a, b) =>
      a.brand.localeCompare(b.brand, 'en', { sensitivity: 'base' }),
    );
  }
}
