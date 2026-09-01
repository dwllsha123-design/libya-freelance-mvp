import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Public } from '../common/decorators/public.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../auth/types/auth-user.type.js';
import { ProfilesService } from './profiles.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { FreelancerQueryDto } from './dto/freelancer-query.dto.js';

@Controller()
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get('profiles/me')
  getMe(@CurrentUser() user: AuthUser) {
    return this.profilesService.getMyProfile(user.id);
  }

  @Patch('profiles/me')
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.profilesService.updateMyProfile(user.id, dto);
  }

  @Post('profiles/me/photo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  uploadPhoto(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.profilesService.uploadProfilePhoto(user.id, file);
  }

  @Public()
  @Get('freelancers')
  listFreelancers(@Query() query: FreelancerQueryDto) {
    return this.profilesService.listFreelancers(query);
  }

  @Public()
  @Get('freelancers/:username')
  getFreelancer(@Param('username') username: string) {
    return this.profilesService.getFreelancerByUsername(username);
  }

  @Public()
  @Get('clients/:username')
  getClient(@Param('username') username: string) {
    return this.profilesService.getClientByUsername(username);
  }
}
