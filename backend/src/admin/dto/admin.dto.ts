import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  PAGINATION_MAX_LIMIT,
} from '../../common/constants/pagination.constants.js';
import {
  AdminAuditAction,
  ProjectStatus,
  ProposalStatus,
  Role,
  UserStatus,
} from '@prisma/client';

export class AdminPaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PAGINATION_MAX_LIMIT)
  limit?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;
}

export class AdminUsersQueryDto extends AdminPaginationQueryDto {
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsUUID()
  cityId?: string;
}

export class AdminProjectsQueryDto extends AdminPaginationQueryDto {
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  clientId?: string;
}

export class AdminProposalsQueryDto extends AdminPaginationQueryDto {
  @IsOptional()
  @IsEnum(ProposalStatus)
  status?: ProposalStatus;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsUUID()
  freelancerId?: string;
}

export class AdminReviewsQueryDto extends AdminPaginationQueryDto {
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  visible?: boolean;
}

export class AdminAuditQueryDto extends AdminPaginationQueryDto {
  @IsOptional()
  @IsEnum(AdminAuditAction)
  action?: AdminAuditAction;

  @IsOptional()
  @IsUUID()
  adminId?: string;
}

export class CreateCategoryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nameAr!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  slug!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nameAr?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

export class CreateSkillDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  slug!: string;
}

export class UpdateSkillDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  slug?: string;
}
