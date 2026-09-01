import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../auth/types/auth-user.type.js';
import { ProjectsService } from './projects.service.js';
import { CreateProjectDto, UpdateProjectDto } from './dto/create-project.dto.js';
import {
  ClientProjectsQueryDto,
  PublicProjectQueryDto,
} from './dto/project-query.dto.js';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Public()
  @Get()
  listPublic(@Query() query: PublicProjectQueryDto) {
    return this.projectsService.listPublic(query);
  }

  @Public()
  @Get('slug/:slug')
  getBySlug(@Param('slug') slug: string) {
    return this.projectsService.getBySlug(slug);
  }

  @Get('manage')
  @Roles(Role.CLIENT)
  listMine(
    @CurrentUser() user: AuthUser,
    @Query() query: ClientProjectsQueryDto,
  ) {
    return this.projectsService.listClientProjects(user.id, query);
  }

  @Post()
  @Roles(Role.CLIENT)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateProjectDto) {
    return this.projectsService.create(user.id, dto);
  }

  @Get(':id/manage')
  @Roles(Role.CLIENT)
  getManage(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.projectsService.getManageProject(user.id, id);
  }

  @Patch(':id')
  @Roles(Role.CLIENT)
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.update(user.id, id, dto);
  }

  @Delete(':id')
  @Roles(Role.CLIENT)
  delete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.projectsService.deleteDraft(user.id, id);
  }

  @Post(':id/publish')
  @Roles(Role.CLIENT)
  publish(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.projectsService.publish(user.id, id);
  }

  @Post(':id/close')
  @Roles(Role.CLIENT)
  close(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.projectsService.close(user.id, id);
  }

  @Post(':id/cancel')
  @Roles(Role.CLIENT)
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.projectsService.cancel(user.id, id);
  }

  @Post(':id/request-completion')
  @Roles(Role.FREELANCER)
  requestCompletion(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.projectsService.requestCompletion(user.id, id);
  }

  @Post(':id/complete')
  @Roles(Role.CLIENT)
  complete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.projectsService.completeProject(user.id, id);
  }
}
