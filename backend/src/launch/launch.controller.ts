import { Controller, Get, UseGuards } from '@nestjs/common';
import { LaunchProgramService } from './launch.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../auth/types/auth-user.type.js';
import { Public } from '../common/decorators/public.decorator.js';

@Controller('launch')
export class LaunchController {
  constructor(private readonly launch: LaunchProgramService) {}

  @Public()
  @Get('program')
  getPublicProgram() {
    return this.launch.getPublicStatus();
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMyStatus(@CurrentUser() user: AuthUser) {
    return this.launch.getUserLaunchStatus(user.id);
  }
}
