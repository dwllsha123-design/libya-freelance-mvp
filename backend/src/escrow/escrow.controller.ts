import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import type { AuthUser } from '../auth/types/auth-user.type.js';
import { EscrowService } from './escrow.service.js';
import { OpenDisputeDto } from './dto/escrow.dto.js';

@Controller('escrow')
export class EscrowController {
  constructor(private readonly escrowService: EscrowService) {}

  @Get('me')
  listMine(@CurrentUser() user: AuthUser) {
    return this.escrowService.listMine(user.id);
  }

  @Get('proposal/:proposalId')
  getByProposal(
    @CurrentUser() user: AuthUser,
    @Param('proposalId') proposalId: string,
  ) {
    return this.escrowService.getByProposal(proposalId, user.id);
  }

  @Get('project/:projectId')
  getByProject(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
  ) {
    return this.escrowService.getByProject(projectId, user.id);
  }

  @Post('prepare/:proposalId')
  @Roles(Role.CLIENT)
  prepare(@CurrentUser() user: AuthUser, @Param('proposalId') proposalId: string) {
    return this.escrowService.prepare(user.id, proposalId);
  }

  @Post('fund/:escrowId')
  @Roles(Role.CLIENT)
  fund(@CurrentUser() user: AuthUser, @Param('escrowId') escrowId: string) {
    return this.escrowService.fund(user.id, escrowId);
  }

  @Post('fund-and-accept/:proposalId')
  @Roles(Role.CLIENT)
  fundAndAccept(
    @CurrentUser() user: AuthUser,
    @Param('proposalId') proposalId: string,
  ) {
    return this.escrowService.fundAndAccept(user.id, proposalId);
  }

  @Post(':escrowId/dispute')
  openDispute(
    @CurrentUser() user: AuthUser,
    @Param('escrowId') escrowId: string,
    @Body() dto: OpenDisputeDto,
  ) {
    return this.escrowService.openDispute(user.id, escrowId, dto.reason);
  }
}
