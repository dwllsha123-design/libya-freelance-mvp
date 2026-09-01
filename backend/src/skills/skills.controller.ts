import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../auth/types/auth-user.type.js';
import { SkillsService } from './skills.service.js';
import { IsUUID } from 'class-validator';

class AddSkillDto {
  @IsUUID()
  skillId!: string;
}

@Controller()
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Public()
  @Get('skills')
  listSkills() {
    return this.skillsService.listSkills();
  }

  @Get('profiles/me/skills')
  mySkills(@CurrentUser() user: AuthUser) {
    return this.skillsService.listFreelancerSkills(user.id);
  }

  @Post('profiles/me/skills')
  addSkill(@CurrentUser() user: AuthUser, @Body() dto: AddSkillDto) {
    return this.skillsService.addSkillToFreelancer(user.id, dto.skillId);
  }

  @Delete('profiles/me/skills/:skillId')
  removeSkill(
    @CurrentUser() user: AuthUser,
    @Param('skillId') skillId: string,
  ) {
    return this.skillsService.removeSkillFromFreelancer(user.id, skillId);
  }
}
