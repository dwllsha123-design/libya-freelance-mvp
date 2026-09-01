import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ProjectBudgetType,
  ProjectExperienceLevel,
  WorkMode,
} from '@prisma/client';

export class CreateProjectDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  description?: string;

  @IsUUID()
  categoryId!: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  skillIds?: string[];

  @IsOptional()
  @IsEnum(ProjectBudgetType)
  budgetType?: ProjectBudgetType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  budgetMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  budgetMax?: number;

  @IsOptional()
  @IsEnum(ProjectExperienceLevel)
  experienceLevel?: ProjectExperienceLevel;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  @IsOptional()
  @IsEnum(WorkMode)
  workMode?: WorkMode;

  @IsOptional()
  @IsUUID()
  cityId?: string;
}

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  description?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  skillIds?: string[];

  @IsOptional()
  @IsEnum(ProjectBudgetType)
  budgetType?: ProjectBudgetType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  budgetMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  budgetMax?: number;

  @IsOptional()
  @IsEnum(ProjectExperienceLevel)
  experienceLevel?: ProjectExperienceLevel;

  @IsOptional()
  @IsDateString()
  deadline?: string | null;

  @IsOptional()
  @IsEnum(WorkMode)
  workMode?: WorkMode;

  @IsOptional()
  @IsUUID()
  cityId?: string | null;
}
