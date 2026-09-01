import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PAGINATION_MAX_LIMIT } from '../../common/constants/pagination.constants.js';
import {
  CONVERSATIONS_DEFAULT_LIMIT,
  MESSAGE_MAX_LENGTH,
  MESSAGE_MIN_LENGTH,
  MESSAGES_DEFAULT_LIMIT,
  MESSAGES_MAX_LIMIT,
} from '../messaging.constants.js';

export class SendMessageDto {
  @IsString()
  @MinLength(MESSAGE_MIN_LENGTH)
  @MaxLength(MESSAGE_MAX_LENGTH)
  content!: string;
}

export class ConversationsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PAGINATION_MAX_LIMIT)
  limit?: number = CONVERSATIONS_DEFAULT_LIMIT;
}

export class MessagesQueryDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MESSAGES_MAX_LIMIT)
  limit?: number = MESSAGES_DEFAULT_LIMIT;
}
