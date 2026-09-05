import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @Type(() => Number)
  @IsNumber()
  PORT: number = 4000;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @MinLength(32)
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @MinLength(32)
  JWT_REFRESH_SECRET!: string;

  @IsString()
  JWT_ACCESS_EXPIRES_IN: string = '15m';

  @IsString()
  JWT_REFRESH_EXPIRES_IN: string = '7d';

  @IsString()
  @IsNotEmpty()
  FRONTEND_URL!: string;

  @IsString()
  @IsNotEmpty()
  CORS_ORIGINS!: string;

  /** Optional outside production. Production completeness is enforced in validate.ts */
  @IsOptional()
  @IsString()
  SMTP_HOST?: string;

  @IsOptional()
  @IsString()
  SMTP_PORT?: string;

  /** `true` | `false` — production should set `true` for port 465 */
  @IsOptional()
  @IsString()
  SMTP_SECURE?: string;

  @IsOptional()
  @IsString()
  SMTP_USER?: string;

  @IsOptional()
  @IsString()
  SMTP_PASSWORD?: string;

  @IsOptional()
  @IsString()
  EMAIL_FROM?: string;

  /** Web Push VAPID — optional; when set, both public + private are required */
  @IsOptional()
  @IsString()
  PUSH_VAPID_PUBLIC_KEY?: string;

  @IsOptional()
  @IsString()
  PUSH_VAPID_PRIVATE_KEY?: string;

  @IsOptional()
  @IsString()
  PUSH_VAPID_SUBJECT?: string;

  @IsString()
  PASSWORD_RESET_TOKEN_EXPIRES_IN: string = '1h';

  @IsString()
  EMAIL_VERIFICATION_TOKEN_EXPIRES_IN: string = '24h';
}
