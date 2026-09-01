import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { StorageService } from './storage.interface.js';

const PROFILE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const PORTFOLIO_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const PROFILE_MAX_SIZE = 2 * 1024 * 1024;
const PORTFOLIO_MAX_SIZE = 5 * 1024 * 1024;

@Injectable()
export class LocalStorageService implements StorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly profileDir: string;
  private readonly portfolioDir: string;
  private readonly profileBaseUrl: string;
  private readonly portfolioBaseUrl: string;

  constructor(configService: ConfigService) {
    this.profileDir =
      configService.get<string>('storage.localDir') ??
      join(process.cwd(), 'uploads', 'profiles');
    this.portfolioDir = join(process.cwd(), 'uploads', 'portfolio');
    this.profileBaseUrl =
      configService.get<string>('storage.publicBaseUrl') ??
      'http://localhost:4000/uploads/profiles';
    this.portfolioBaseUrl =
      configService.get<string>('storage.portfolioPublicBaseUrl') ??
      'http://localhost:4000/uploads/portfolio';
  }

  async uploadProfileImage(
    userId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    this.validateImage(file, PROFILE_MIME_TYPES, PROFILE_MAX_SIZE);

    const extension = extname(file.originalname).toLowerCase() || '.jpg';
    const filename = `${userId}-${randomUUID()}${extension}`;
    const userDir = join(this.profileDir, userId);

    await mkdir(userDir, { recursive: true });
    await writeFile(join(userDir, filename), file.buffer);

    return `${this.profileBaseUrl}/${userId}/${filename}`;
  }

  async uploadPortfolioImage(
    userId: string,
    portfolioItemId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    this.validateImage(file, PORTFOLIO_MIME_TYPES, PORTFOLIO_MAX_SIZE);

    const extension = extname(file.originalname).toLowerCase() || '.jpg';
    const filename = `${randomUUID()}${extension}`;
    const itemDir = join(this.portfolioDir, userId, portfolioItemId);

    await mkdir(itemDir, { recursive: true });
    await writeFile(join(itemDir, filename), file.buffer);

    return `${this.portfolioBaseUrl}/${userId}/${portfolioItemId}/${filename}`;
  }

  async deleteFile(url: string): Promise<void> {
    const profileRelative = this.extractRelative(url, this.profileBaseUrl);
    if (profileRelative) {
      await this.safeUnlink(join(this.profileDir, profileRelative));
      return;
    }

    const portfolioRelative = this.extractRelative(url, this.portfolioBaseUrl);
    if (portfolioRelative) {
      await this.safeUnlink(join(this.portfolioDir, portfolioRelative));
    }
  }

  private validateImage(
    file: Express.Multer.File,
    allowed: Set<string>,
    maxSize: number,
  ) {
    if (!allowed.has(file.mimetype)) {
      throw new BadRequestException('نوع الملف غير مدعوم');
    }

    if (file.size > maxSize) {
      throw new BadRequestException('حجم الملف يتجاوز الحد المسموح');
    }
  }

  private extractRelative(url: string, baseUrl: string): string | null {
    if (!url.startsWith(baseUrl)) {
      return null;
    }

    return url.replace(`${baseUrl}/`, '');
  }

  private async safeUnlink(filePath: string) {
    try {
      await unlink(filePath);
    } catch (error) {
      this.logger.warn(`Failed to delete file ${filePath}: ${String(error)}`);
    }
  }
}
