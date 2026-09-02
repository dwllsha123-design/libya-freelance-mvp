import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
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
import {
  AdminPermission,
  BroadcastAudience,
  FeaturedEntityType,
} from '@prisma/client';

export class PatchPlatformSettingsDto {
  @IsObject()
  settings!: Record<string, unknown>;
}

export class PatchFeatureFlagsDto {
  @IsObject()
  flags!: Record<string, boolean>;
}

export class PatchCmsContentDto {
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  key!: string;

  @IsObject()
  contentJson!: Record<string, unknown>;
}

export class CreateBannerDto {
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  text!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  link?: string | null;

  @IsOptional()
  @IsDateString()
  startsAt?: string | null;

  @IsOptional()
  @IsDateString()
  endsAt?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateBannerDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  text?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  link?: string | null;

  @IsOptional()
  @IsDateString()
  startsAt?: string | null;

  @IsOptional()
  @IsDateString()
  endsAt?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class FeatureItemDto {
  @IsEnum(FeaturedEntityType)
  entityType!: FeaturedEntityType;

  @IsUUID()
  entityId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

export class ReorderFeaturedDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  orderedIds!: string[];
}

export class BroadcastPreviewDto {
  @IsEnum(BroadcastAudience)
  audience!: BroadcastAudience;

  @ValidateIf((o: BroadcastPreviewDto) => o.audience === BroadcastAudience.SPECIFIC_USER)
  @IsUUID()
  specificUserId?: string;
}

export class BroadcastSendDto extends BroadcastPreviewDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  targetUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  idempotencyKey?: string;
}

export class CreateStaffAdminDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(60)
  firstName!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(60)
  lastName!: string;

  @IsOptional()
  @IsArray()
  @IsEnum(AdminPermission, { each: true })
  permissions?: AdminPermission[];
}

export class AssignAdminPermissionsDto {
  @IsArray()
  @IsEnum(AdminPermission, { each: true })
  permissions!: AdminPermission[];
}

export class PortfolioModerationDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}

export class CreateInvestorPayoutDto {
  @IsUUID()
  investorId!: string;

  @IsOptional()
  @IsUUID()
  statementId?: string | null;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  paymentReference?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string | null;
}

export class TransitionInvestorPayoutDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  paymentReference?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string | null;
}

export class CreateInvestorStatementDto {
  @IsUUID()
  investorId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  periodYear!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  periodMonth!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  openingBalance?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  adjustments?: number;
}

export class AdminSearchQueryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  q!: string;
}

export class AdminDashboardQueryDto {
  @IsOptional()
  @IsString()
  range?: '7d' | '30d' | '3m' | '6m' | '12m';
}

export class AdminPortfolioQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  hiddenOnly?: boolean;
}
