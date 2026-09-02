import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ProposalStatus } from '@prisma/client';
import {
  COVER_LETTER_MAX,
  COVER_LETTER_MIN,
  ESTIMATED_DURATION_MAX_DAYS,
  ESTIMATED_DURATION_MIN_DAYS,
  PROPOSAL_BOOST_MAX,
  PROPOSAL_BOOST_MIN,
} from '../proposals.constants.js';

export class CreateProposalDto {
  @IsString()
  @MinLength(COVER_LETTER_MIN)
  @MaxLength(COVER_LETTER_MAX)
  coverLetter!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  proposedPrice!: number;

  @Type(() => Number)
  @IsInt()
  @Min(ESTIMATED_DURATION_MIN_DAYS)
  @Max(ESTIMATED_DURATION_MAX_DAYS)
  estimatedDurationDays!: number;

  /** Optional Nuqati points spent to boost ranking on the project. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(PROPOSAL_BOOST_MIN)
  @Max(PROPOSAL_BOOST_MAX)
  boostPoints?: number;
}

export class MyProposalsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;

  @IsOptional()
  status?: ProposalStatus;
}
