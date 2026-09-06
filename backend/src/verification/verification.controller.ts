import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { AdminPermission, Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RequireAdminPermission } from '../common/decorators/admin-permission.decorator.js';
import { SuperAdminGuard } from '../common/guards/super-admin.guard.js';
import { AdminPermissionGuard } from '../common/guards/admin-permission.guard.js';
import type { AuthUser } from '../auth/types/auth-user.type.js';
import { VerificationService } from './verification.service.js';
import {
  RejectIdentityVerificationDto,
  SubmitIdentityVerificationDto,
  SuspendIdentityVerificationDto,
} from './dto/verification.dto.js';
import { VERIFICATION_DOC_MAX_COUNT, VERIFICATION_DOC_MAX_SIZE } from '../subscriptions/subscriptions.constants.js';

@Controller('verification')
export class VerificationController {
  constructor(private readonly verification: VerificationService) {}

  @Get('me')
  @Roles(Role.FREELANCER)
  getMine(@CurrentUser() user: AuthUser) {
    return this.verification.getMine(user.id);
  }

  @Post('submit')
  @Roles(Role.FREELANCER)
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'documents', maxCount: VERIFICATION_DOC_MAX_COUNT }], {
      storage: memoryStorage(),
      limits: { fileSize: VERIFICATION_DOC_MAX_SIZE },
    }),
  )
  submit(
    @CurrentUser() user: AuthUser,
    @Body() dto: SubmitIdentityVerificationDto,
    @UploadedFiles() files: { documents?: Express.Multer.File[] },
  ) {
    return this.verification.submit(user.id, dto, files?.documents ?? []);
  }
}

@Controller('admin/verifications')
@Roles(Role.ADMIN)
@UseGuards(SuperAdminGuard, AdminPermissionGuard)
export class AdminVerificationController {
  constructor(private readonly verification: VerificationService) {}

  @Get()
  @RequireAdminPermission(AdminPermission.MANAGE_VERIFICATIONS)
  list(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.verification.adminList({
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(':id')
  @RequireAdminPermission(AdminPermission.MANAGE_VERIFICATIONS)
  getOne(@Param('id') id: string) {
    return this.verification.adminGet(id);
  }

  @Post(':id/approve')
  @RequireAdminPermission(AdminPermission.MANAGE_VERIFICATIONS)
  approve(@CurrentUser() admin: AuthUser, @Param('id') id: string) {
    return this.verification.approve(admin.id, id);
  }

  @Post(':id/reject')
  @RequireAdminPermission(AdminPermission.MANAGE_VERIFICATIONS)
  reject(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: RejectIdentityVerificationDto,
  ) {
    return this.verification.reject(admin.id, id, dto);
  }

  @Post(':id/request-resubmission')
  @RequireAdminPermission(AdminPermission.MANAGE_VERIFICATIONS)
  requestResubmission(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: RejectIdentityVerificationDto,
  ) {
    return this.verification.requestResubmission(admin.id, id, dto);
  }

  @Post(':id/suspend')
  @RequireAdminPermission(AdminPermission.MANAGE_VERIFICATIONS)
  suspend(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: SuspendIdentityVerificationDto,
  ) {
    return this.verification.suspend(admin.id, id, dto);
  }

  @Get(':id/documents/:documentId')
  @RequireAdminPermission(AdminPermission.MANAGE_VERIFICATIONS)
  async downloadDocument(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Param('documentId') documentId: string,
    @Res() res: Response,
  ) {
    const { buffer, mimeType } = await this.verification.getDocumentBuffer(
      admin.id,
      id,
      documentId,
    );
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', 'attachment; filename="verification-doc"');
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(buffer);
  }
}
