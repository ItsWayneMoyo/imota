import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreatePricingDto {
  @IsString()
  name!: string;

  @IsInt() @Type(() => Number)
  base!: number;

  @IsInt() @Type(() => Number)
  perKm!: number;

  @IsInt() @Type(() => Number)
  perMin!: number;

  @IsInt() @Type(() => Number)
  minimum!: number;

  @IsNumber() @IsOptional() @Type(() => Number)
  surge?: number;

  /** ISO string (optional) */
  @IsString() @IsOptional()
  startAt?: string;
}

export class UpdatePricingDto {
  @IsString() @IsOptional()
  name?: string;

  @IsInt() @IsOptional() @Type(() => Number)
  base?: number;

  @IsInt() @IsOptional() @Type(() => Number)
  perKm?: number;

  @IsInt() @IsOptional() @Type(() => Number)
  perMin?: number;

  @IsInt() @IsOptional() @Type(() => Number)
  minimum?: number;

  @IsNumber() @IsOptional() @Type(() => Number)
  surge?: number;

  @IsString() @IsOptional()
  startAt?: string;

  @IsOptional()
  active?: boolean;
}

export class SurgeDto {
  @IsNumber() @Type(() => Number)
  surge!: number;
}
