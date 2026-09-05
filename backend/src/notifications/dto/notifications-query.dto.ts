import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { PAGINATION_MAX_LIMIT } from '../../common/constants/pagination.constants.js';
import { NotificationType } from '@prisma/client';

export class NotificationsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PAGINATION_MAX_LIMIT)
  limit?: number;

  @IsOptional()
  @IsIn(['unread', 'read'])
  status?: 'unread' | 'read';

  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  @IsIn(['all', 'PROJECTS', 'MESSAGES', 'PAYMENTS', 'POINTS', 'SYSTEM'])
  category?: 'all' | 'PROJECTS' | 'MESSAGES' | 'PAYMENTS' | 'POINTS' | 'SYSTEM';
}
