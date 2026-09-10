import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { FreelancerAvailability, WorkMode } from '@prisma/client';
import { MAX_FREELANCER_SKILLS } from '../../common/constants/profile.constants.js';

/**
 * Admin-editable freelancer profile fields only.
 * Never accepts password, tokens, secrets, or role/status changes here.
 */
export class AdminUpdateFreelancerDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  professionalTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  cityId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsEnum(WorkMode)
  workMode?: WorkMode;

  @IsOptional()
  @IsEnum(FreelancerAvailability)
  availability?: FreelancerAvailability;

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1_000_000)
  hourlyRate?: number | null;

  /**
   * Omitted → leave existing skills unchanged.
   * Present (including `[]`) → replace the full skill set (`[]` clears all).
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_FREELANCER_SKILLS)
  @IsUUID('4', { each: true })
  skillIds?: string[];
}
