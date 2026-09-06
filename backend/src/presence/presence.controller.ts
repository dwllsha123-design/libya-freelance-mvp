import { Body, Controller, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../auth/types/auth-user.type.js';
import { PresenceLookupDto } from './dto/presence-lookup.dto.js';
import { PresenceService } from './presence.service.js';

@Controller('presence')
export class PresenceController {
  constructor(private readonly presence: PresenceService) {}

  /**
   * Batch presence for users relevant to the current UI.
   * No public dump of all online users — only requested IDs (capped).
   */
  @Post('lookup')
  async lookup(
    @Body() body: PresenceLookupDto,
    @CurrentUser() user: AuthUser,
  ) {
    const items = await this.presence.getPresenceBatch(body.userIds, {
      id: user.id,
      role: user.role as Role,
    });
    return { items };
  }
}
