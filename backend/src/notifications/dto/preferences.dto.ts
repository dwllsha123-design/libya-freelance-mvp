import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class PreferenceUpdateItemDto {
  @IsString()
  @MaxLength(40)
  notificationType!: string;

  @IsOptional()
  @IsBoolean()
  inAppEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;
}

export class UpdatePreferencesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PreferenceUpdateItemDto)
  preferences!: PreferenceUpdateItemDto[];
}

export class CreatePushSubscriptionDto {
  @IsUrl({ require_tld: false, protocols: ['https', 'http'] })
  @MaxLength(2048)
  endpoint!: string;

  @IsString()
  @MaxLength(512)
  p256dh!: string;

  @IsString()
  @MaxLength(512)
  auth!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  deviceType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  browser?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  userAgent?: string;
}
