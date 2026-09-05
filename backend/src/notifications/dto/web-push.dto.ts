import { IsNotEmpty, IsObject, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import {
  WEB_PUSH_ENDPOINT_MAX_LEN,
  WEB_PUSH_KEY_MAX_LEN,
} from '../web-push-subscription.util.js';

class PushSubscriptionKeysDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(WEB_PUSH_KEY_MAX_LEN)
  p256dh!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(WEB_PUSH_KEY_MAX_LEN)
  auth!: string;
}

export class SubscribeWebPushDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(WEB_PUSH_ENDPOINT_MAX_LEN)
  endpoint!: string;

  @IsObject()
  @ValidateNested()
  @Type(() => PushSubscriptionKeysDto)
  keys!: PushSubscriptionKeysDto;
}

export class UnsubscribeWebPushDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(WEB_PUSH_ENDPOINT_MAX_LEN)
  endpoint!: string;
}
