import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { AuthClientMetaDto } from './auth-session.dto.js';

export class LoginDto extends AuthClientMetaDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  /**
   * Login surface:
   * - platform → libyanfreelance.ly (CLIENT / FREELANCER only)
   * - admin → admin.libyanfreelance.ly (staff only)
   * Defaults to platform for safety (staff cannot use marketplace login by accident).
   */
  @IsOptional()
  @IsIn(['platform', 'admin'])
  audience?: 'platform' | 'admin';
}
