import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { PAGINATION_MAX_LIMIT } from '../../common/constants/pagination.constants.js';
import {
  ProjectBudgetType,
  ProjectExperienceLevel,
  ProjectStatus,
  WorkMode,
} from '@prisma/client';

export enum ProjectSortOption {
  NEWEST = 'newest',
  OLDEST = 'oldest',
  BUDGET_HIGH = 'budget_high',
  BUDGET_LOW = 'budget_low',
}

export class PublicProjectQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PAGINATION_MAX_LIMIT)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  skill?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsEnum(WorkMode)
  workMode?: WorkMode;

  @IsOptional()
  @IsEnum(ProjectBudgetType)
  budgetType?: ProjectBudgetType;

  @IsOptional()
  @IsEnum(ProjectExperienceLevel)
  experienceLevel?: ProjectExperienceLevel;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minBudget?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxBudget?: number;

  @IsOptional()
  @IsEnum(ProjectSortOption)
  sort?: ProjectSortOption = ProjectSortOption.NEWEST;
}

export class ClientProjectsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PAGINATION_MAX_LIMIT)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;
}
