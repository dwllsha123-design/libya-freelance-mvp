import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

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
