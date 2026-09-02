import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { AdminPermission, InvestorRevenueBase } from '@prisma/client';
import { Type } from 'class-transformer';

export class SchedulePlatformCommissionDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  defaultCommissionPercentage!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minimumCommissionAmount?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maximumCommissionAmount?: number | null;

  @IsDateString()
  effectiveFrom!: string;

  @IsString()
  @MinLength(3)
  reason!: string;

  @IsBoolean()
  confirm!: boolean;
}

export class SetCategoryCommissionDto {
  @ValidateIf((_, v) => v !== null)
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionPercentage!: number | null;

  @IsDateString()
  effectiveFrom!: string;

  @IsString()
  @MinLength(3)
  reason!: string;
}

export class SetProjectCommissionOverrideDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionPercentage!: number;

  @IsDateString()
  effectiveFrom!: string;

  @IsString()
  @MinLength(5)
  reason!: string;

  @IsBoolean()
  confirm!: boolean;
}

export class EndProjectOverrideDto {
  @IsString()
  @MinLength(3)
  reason!: string;
}

export class CreateInvestorDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateInvestmentAgreementDto {
  @IsUUID()
  investorId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  investmentAmount!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  sharePercentage!: number;

  @IsOptional()
  @IsEnum(InvestorRevenueBase)
  revenueBase?: InvestorRevenueBase;

  @IsDateString()
  effectiveFrom!: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  returnCap?: number | null;

  @IsString()
  @MinLength(3)
  reason!: string;

  @IsBoolean()
  confirm!: boolean;

  @IsOptional()
  @IsUUID()
  supersedeAgreementId?: string;
}

export class TerminateAgreementDto {
  @IsString()
  @MinLength(3)
  reason!: string;

  @IsBoolean()
  confirm!: boolean;
}

export class CommissionPreviewDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  projectValue!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionPercent!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  investorSharePercent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minimumCommissionAmount?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maximumCommissionAmount?: number | null;
}

export class ResolveCommissionPreviewDto {
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  projectValue!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionPercent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  investorSharePercent?: number;
}

export class FinancePermissionDto {
  @IsUUID()
  userId!: string;

  @IsEnum(AdminPermission)
  permission!: AdminPermission;
}

export class UpdateFutureFeeSettingDto {
  @IsObject()
  valueJson!: Record<string, unknown>;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string | null;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsString()
  @MinLength(3)
  reason!: string;
}
