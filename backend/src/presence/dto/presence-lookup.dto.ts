import { ArrayMaxSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';
import { PRESENCE_LOOKUP_MAX_IDS } from '../presence.constants.js';

export class PresenceLookupDto {
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(PRESENCE_LOOKUP_MAX_IDS)
  @IsUUID('4', { each: true })
  userIds!: string[];
}
