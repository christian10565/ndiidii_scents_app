import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const toBool = ({ value }: { value: unknown }) =>
  value === 'true' || value === '1' || value === true
    ? true
    : value === 'false' || value === '0' || value === false
      ? false
      : undefined;

class PagedQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page: number = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit: number = 24;

  /** Free-text search over name and brand. */
  @IsOptional() @IsString()
  q?: string;

  /** One or more brands, comma-separated: ?brand=Lattafa,Armaf */
  @IsOptional() @IsString()
  brand?: string;

  /** One or more genders, comma-separated: ?gender=men,unisex (values: men, women, unisex) */
  @IsOptional() @IsString()
  gender?: string;

  /** true = only in stock, false = only out of stock, omitted = both. */
  @IsOptional() @Transform(toBool) @IsBoolean()
  inStock?: boolean;

  @IsOptional() @IsIn(['featured', 'name', 'newest'])
  sort: 'featured' | 'name' | 'newest' = 'featured';
}

export class ListPerfumesQuery extends PagedQuery {
  /** One or more tiers, comma-separated: ?tier=1,2 */
  @IsOptional() @IsString()
  tier?: string;
}

export class ListOilsQuery extends PagedQuery {
  @IsOptional() @IsIn(['designer', 'niche'])
  category?: 'designer' | 'niche';
}
