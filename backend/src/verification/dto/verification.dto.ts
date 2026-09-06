import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SubmitIdentityVerificationDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  fullNameAsOnId!: string;

  @IsString()
  @Matches(/^\d{4,20}$/)
  nationalId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  freelancerNote?: string;
}

export class RejectIdentityVerificationDto {
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  rejectionReason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  adminNote?: string;
}

export class SuspendIdentityVerificationDto {
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  reason!: string;
}
