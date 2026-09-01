import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class InitiateEscrowPaymentDto {
  @IsOptional()
  @IsUrl({ require_tld: false })
  returnUrl?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  cancelUrl?: string;
}

export class PaymentWebhookHeadersDto {
  @IsOptional()
  @IsString()
  @MaxLength(256)
  'x-signature'?: string;
}
