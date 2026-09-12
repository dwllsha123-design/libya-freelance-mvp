import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreatePointsPackageDto {
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  code!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nameAr!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nameEn!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  points!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bonusPoints?: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  priceLyd!: number;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_000)
  sortOrder?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePointsPackageDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nameAr?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nameEn?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  points?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bonusPoints?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  priceLyd?: number;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_000)
  sortOrder?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
