import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import type { AuthUser } from '../auth/types/auth-user.type.js';
import { AgreementsService } from './agreements.service.js';
import {
  CreateAgreementChangeRequestDto,
  CreateAgreementDto,
} from './dto/agreements.dto.js';

@Controller('agreements')
export class AgreementsController {
  constructor(private readonly agreements: AgreementsService) {}

  @Post()
  @Roles(Role.CLIENT)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAgreementDto) {
    return this.agreements.createFromProposal(user.id, dto.proposalId);
  }

  @Get('me')
  listMine(@CurrentUser() user: AuthUser) {
    return this.agreements.listMine(user.id);
  }

  @Get('project/:projectId')
  getByProject(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
  ) {
    return this.agreements.getByProject(projectId, user.id);
  }

  @Get(':id')
  getOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.agreements.getForParticipant(id, user.id);
  }

  @Get(':id/versions')
  getVersions(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.agreements.getVersions(id, user.id);
  }

  @Get(':id/history')
  getHistory(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.agreements.getHistory(id, user.id);
  }

  @Post(':id/accept')
  accept(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const forwarded = req.headers['x-forwarded-for'];
    const ip =
      typeof forwarded === 'string'
        ? forwarded.split(',')[0]?.trim()
        : req.ip;
    return this.agreements.accept(id, user.id, {
      userAgent: req.headers['user-agent'] ?? null,
      ip: ip ?? null,
    });
  }

  @Post(':id/change-request')
  changeRequest(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateAgreementChangeRequestDto,
  ) {
    return this.agreements.requestChange(id, user.id, dto);
  }
}
