import { PAGINATION_MAX_LIMIT } from '../../common/constants/pagination.constants.js';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

function toOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === true || value === 'true' || value === '1') return true;
  if (value === false || value === 'false' || value === '0') return false;
  return undefined;
}

export class FreelancerQueryDto {
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
  skill?: string;

  /** Project category slug — soft-mapped to related skill slugs. */
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsIn(['REMOTE', 'ON_SITE', 'HYBRID'])
  workMode?: 'REMOTE' | 'ON_SITE' | 'HYBRID';

  @IsOptional()
  @IsIn(['AVAILABLE', 'BUSY', 'UNAVAILABLE'])
  availability?: 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  minRating?: number;

  /** Identity KYC only (`FreelancerIdentityVerification` VERIFIED + not expired). */
  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  verified?: boolean;

  /** Presence filter: all | online | active_today | active_week */
  @IsOptional()
  @IsIn(['all', 'online', 'active_today', 'active_week'])
  activity?: 'all' | 'online' | 'active_today' | 'active_week' = 'all';

  /**
   * relevant — quality ranking (default)
   * rating — highest average rating
   * completed — most completed projects
   * newest — newest profiles
   */
  @IsOptional()
  @IsIn(['relevant', 'rating', 'completed', 'newest'])
  sort?: 'relevant' | 'rating' | 'completed' | 'newest' = 'relevant';
}
