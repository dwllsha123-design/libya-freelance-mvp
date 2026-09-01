import { IsIn, IsString, MinLength } from 'class-validator';

export class OpenDisputeDto {
  @IsString()
  @MinLength(10, { message: 'سبب النزاع يجب أن يكون 10 أحرف على الأقل' })
  reason!: string;
}

export class ResolveDisputeDto {
  @IsString()
  @MinLength(5)
  resolution!: string;

  @IsIn(['REFUND_CLIENT', 'RELEASE_FREELANCER'])
  outcome!: 'REFUND_CLIENT' | 'RELEASE_FREELANCER';
}
