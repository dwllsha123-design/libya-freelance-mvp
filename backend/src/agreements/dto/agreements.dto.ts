import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { AgreementChangeType } from '@prisma/client';

export class CreateAgreementDto {
  @IsUUID()
  proposalId!: string;
}

export class CreateAgreementChangeRequestDto {
  @IsEnum(AgreementChangeType)
  changeType!: AgreementChangeType;

  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  proposedTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  proposedScope?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  proposedDeliverables?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  proposedGrossAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  proposedDurationDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  proposedRevisionCount?: number;

  @IsOptional()
  @IsDateString()
  proposedDeliveryDate?: string;
}
