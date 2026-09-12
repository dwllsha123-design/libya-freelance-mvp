import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CheckoutSubscriptionDto {
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  planCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  returnUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  cancelUrl?: string;
}

/** @deprecated Prefer CheckoutSubscriptionDto with planCode */
export class LegacyProCheckoutDto {
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  returnUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  cancelUrl?: string;
}

export class CreateSubscriptionPlanDto {
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
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price!: number;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationDays!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  portfolioItemLimit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  visibilityWeight?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  rankingBoostWeight?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  proposalQuotaMonthly?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  monthlyPointsGrant?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  badgeKey?: string | null;

  @IsOptional()
  @IsObject()
  featuresJson?: Record<string, unknown>;

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

export class UpdateSubscriptionPlanDto {
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
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  portfolioItemLimit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  visibilityWeight?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  rankingBoostWeight?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  proposalQuotaMonthly?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  monthlyPointsGrant?: number;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(64)
  badgeKey?: string | null;

  @IsOptional()
  @IsObject()
  featuresJson?: Record<string, unknown> | null;

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

export class GrantSubscriptionDto {
  @IsUUID()
  userId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(64)
  planCode!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3650)
  days!: number;

  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  reason!: string;
}

export class ExtendSubscriptionDto {
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  reason!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  extraDays?: number;

  @IsOptional()
  @IsDateString()
  newExpiresAt?: string;
}

export class SubscriptionAdminReasonDto {
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  reason!: string;
}
