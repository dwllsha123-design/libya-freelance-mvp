import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { StorageService } from './storage.interface.js';
import {
  PORTFOLIO_MAX_SIZE,
  PORTFOLIO_MIME_TYPES,
  PROFILE_MAX_SIZE,
  PROFILE_MIME_TYPES,
  buildPortfolioObjectKey,
  buildProfileObjectKey,
  objectKeyFromPublicUrl,
  validateImageUpload,
} from './storage-upload.util.js';

@Injectable()
export class LocalStorageService implements StorageService {
  private readonly profileDir: string;
  private readonly portfolioDir: string;
  private readonly profileBaseUrl: string;
  private readonly portfolioBaseUrl: string;

  constructor(configService: ConfigService) {
    this.profileDir =
      configService.get<string>('storage.localDir') ??
      join(process.cwd(), 'uploads', 'profiles');
    this.portfolioDir = join(process.cwd(), 'uploads', 'portfolio');
    const apiBase =
      configService.get<string>('storage.publicBaseUrl') ??
      'http://localhost:4000/uploads/profiles';
    this.profileBaseUrl = apiBase.replace(/\/$/, '');
    this.portfolioBaseUrl =
      configService.get<string>('storage.portfolioPublicBaseUrl') ??
      'http://localhost:4000/uploads/portfolio';
  }

  async uploadProfileImage(
    userId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    validateImageUpload(file, PROFILE_MIME_TYPES, PROFILE_MAX_SIZE);
    const key = buildProfileObjectKey(userId, file.mimetype);
    const relative = key.replace(/^profile-images\//, '');
    const [segmentUserId, filename] = relative.split('/');
    const userDir = join(this.profileDir, segmentUserId);
    await mkdir(userDir, { recursive: true });
    await writeFile(join(userDir, filename), file.buffer);
    return `${this.profileBaseUrl}/${segmentUserId}/${filename}`;
  }

  async uploadPortfolioImage(
    userId: string,
    portfolioItemId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    validateImageUpload(file, PORTFOLIO_MIME_TYPES, PORTFOLIO_MAX_SIZE);
    const key = buildPortfolioObjectKey(userId, portfolioItemId, file.mimetype);
    const relative = key.replace(/^portfolio\//, '');
    const parts = relative.split('/');
    const itemDir = join(this.portfolioDir, ...parts.slice(0, -1));
    const filename = parts[parts.length - 1]!;
    await mkdir(itemDir, { recursive: true });
    await writeFile(join(itemDir, filename), file.buffer);
    return `${this.portfolioBaseUrl}/${relative}`;
  }

  async deleteFile(url: string): Promise<void> {
    const profileKey = objectKeyFromPublicUrl(url, this.profileBaseUrl);
    if (profileKey) {
      const relative = profileKey.replace(/^profile-images\//, '');
      await this.safeUnlink(join(this.profileDir, ...relative.split('/')));
      return;
    }

    const portfolioKey = objectKeyFromPublicUrl(url, this.portfolioBaseUrl);
    if (portfolioKey) {
      const relative = portfolioKey.replace(/^portfolio\//, '');
      await this.safeUnlink(join(this.portfolioDir, ...relative.split('/')));
    }
  }

  private async safeUnlink(filePath: string) {
    try {
      await unlink(filePath);
    } catch {
      // best-effort delete
    }
  }
}
