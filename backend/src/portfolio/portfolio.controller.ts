import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Role } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../auth/types/auth-user.type.js';
import {
  CreatePortfolioDto,
  ReorderPortfolioDto,
  UpdatePortfolioDto,
} from './dto/portfolio.dto.js';
import { PortfolioService } from './portfolio.service.js';

@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get('me')
  @Roles(Role.FREELANCER)
  listMine(@CurrentUser() user: AuthUser) {
    return this.portfolioService.listMine(user.id);
  }

  @Post()
  @Roles(Role.FREELANCER)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePortfolioDto) {
    return this.portfolioService.create(user.id, dto);
  }

  @Patch('reorder')
  @Roles(Role.FREELANCER)
  reorder(@CurrentUser() user: AuthUser, @Body() dto: ReorderPortfolioDto) {
    return this.portfolioService.reorder(user.id, dto);
  }

  @Public()
  @Get(':id')
  getPublic(@Param('id') id: string) {
    return this.portfolioService.getPublicById(id);
  }

  @Get(':id/manage')
  @Roles(Role.FREELANCER)
  getMine(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.portfolioService.getById(user.id, id);
  }

  @Patch(':id')
  @Roles(Role.FREELANCER)
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePortfolioDto,
  ) {
    return this.portfolioService.update(user.id, id, dto);
  }

  @Delete(':id')
  @Roles(Role.FREELANCER)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.portfolioService.remove(user.id, id);
  }

  @Post(':id/images')
  @Roles(Role.FREELANCER)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadImage(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.portfolioService.addImage(user.id, id, file);
  }

  @Delete(':id/images/:imageId')
  @Roles(Role.FREELANCER)
  removeImage(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('imageId') imageId: string,
  ) {
    return this.portfolioService.removeImage(user.id, id, imageId);
  }
}
