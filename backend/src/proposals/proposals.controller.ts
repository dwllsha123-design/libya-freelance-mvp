import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import type { AuthUser } from '../auth/types/auth-user.type.js';
import { ProposalsService } from './proposals.service.js';
import {
  CreateProposalDto,
  MyProposalsQueryDto,
} from './dto/create-proposal.dto.js';

@Controller()
export class ProposalsController {
  constructor(private readonly proposalsService: ProposalsService) {}

  @Post('projects/:projectId/proposals')
  @Roles(Role.FREELANCER)
  submit(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
    @Body() dto: CreateProposalDto,
  ) {
    return this.proposalsService.submit(user.id, projectId, dto);
  }

  @Get('proposals/me')
  @Roles(Role.FREELANCER)
  listMine(
    @CurrentUser() user: AuthUser,
    @Query() query: MyProposalsQueryDto,
  ) {
    return this.proposalsService.listMine(user.id, query);
  }

  @Get('projects/:projectId/proposals')
  @Roles(Role.CLIENT)
  listForProject(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
  ) {
    return this.proposalsService.listForProject(user.id, projectId);
  }

  @Get('projects/:projectId/proposals/me')
  @Roles(Role.FREELANCER)
  getMyProposalForProject(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
  ) {
    return this.proposalsService.getMyProposalForProject(user.id, projectId);
  }

  @Post('proposals/:id/accept')
  @Roles(Role.CLIENT)
  accept(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.proposalsService.accept(user.id, id);
  }

  @Post('proposals/:id/reject')
  @Roles(Role.CLIENT)
  reject(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.proposalsService.reject(user.id, id);
  }

  @Post('proposals/:id/withdraw')
  @Roles(Role.FREELANCER)
  withdraw(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.proposalsService.withdraw(user.id, id);
  }
}
