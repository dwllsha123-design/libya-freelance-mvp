import { Controller, Get } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import type { AuthUser } from '../auth/types/auth-user.type.js';
import { BadgeService } from './badge.service.js';

@Controller()
export class BadgesController {
  constructor(private readonly badges: BadgeService) {}

  @Get('freelancers/me/badges')
  @Roles(Role.FREELANCER)
  getMyBadges(@CurrentUser() user: AuthUser) {
    return this.badges.getMyBadgeProgress(user.id);
  }
}
