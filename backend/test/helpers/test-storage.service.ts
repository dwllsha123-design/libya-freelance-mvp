import { BadRequestException } from '@nestjs/common';
import type { StorageService } from '../../src/storage/storage.interface.js';

const PORTFOLIO_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const PORTFOLIO_MAX_SIZE = 5 * 1024 * 1024;

export class TestStorageService implements StorageService {
  readonly uploadedUrls: string[] = [];
  readonly deletedUrls: string[] = [];

  async uploadProfileImage(
    userId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    const url = `http://test.storage/profiles/${userId}/${file.originalname}`;
    this.uploadedUrls.push(url);
    return url;
  }

  async uploadPortfolioImage(
    userId: string,
    portfolioItemId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    if (!PORTFOLIO_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('نوع الملف غير مدعوم');
    }

    if (file.size > PORTFOLIO_MAX_SIZE) {
      throw new BadRequestException('حجم الملف يتجاوز الحد المسموح');
    }

    const url = `http://test.storage/portfolio/${userId}/${portfolioItemId}/${file.originalname}`;
    this.uploadedUrls.push(url);
    return url;
  }

  async uploadChatFile(
    userId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    const url = `http://test.storage/chat/${userId}/${file.originalname}`;
    this.uploadedUrls.push(url);
    return url;
  }

  async deleteFile(url: string): Promise<void> {
    this.deletedUrls.push(url);
  }
}
