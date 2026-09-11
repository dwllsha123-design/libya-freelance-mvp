import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

/**
 * Client channel is metadata for token delivery only — never authorization.
 * - web (default): refresh stays in HttpOnly cookie; not returned in JSON
 * - native: refresh returned in JSON for Keychain / Keystore / SecureStore
 */
export class AuthClientMetaDto {
  @IsOptional()
  @IsIn(['web', 'native'])
  clientChannel?: 'web' | 'native';

  /** Required when clientChannel is native. WEB platform is not valid here. */
  @ValidateIf((o: AuthClientMetaDto) => o.clientChannel === 'native')
  @IsIn(['IOS', 'ANDROID'])
  platform?: 'IOS' | 'ANDROID';

  @IsOptional()
  @IsString()
  @MaxLength(64)
  appVersion?: string;
}

/** Optional body refresh for native clients (SecureStore). Web uses cookie only. */
export class RefreshSessionDto {
  @IsOptional()
  @IsString()
  @MaxLength(4096)
  refreshToken?: string;
}

export class LogoutSessionDto {
  @IsOptional()
  @IsString()
  @MaxLength(4096)
  refreshToken?: string;
}
