import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { StorageService } from './storage.interface.js';
import { toPortfolioWebp, toProfileWebp } from './image-webp.util.js';
import {
  PORTFOLIO_MAX_SIZE,
  PORTFOLIO_MIME_TYPES,
  PROFILE_MAX_SIZE,
  PROFILE_MIME_TYPES,
  buildChatObjectKey,
  buildPortfolioObjectKey,
  buildProfileObjectKey,
  objectKeyFromPublicUrl,
  validateChatUpload,
  validateImageUpload,
} from './storage-upload.util.js';

@Injectable()
export class LocalStorageService implements StorageService {
  private readonly profileDir: string;
  private readonly portfolioDir: string;
  private readonly chatDir: string;
  private readonly profileBaseUrl: string;
  private readonly portfolioBaseUrl: string;
  private readonly chatBaseUrl: string;

  constructor(configService: ConfigService) {
    this.profileDir =
      configService.get<string>('storage.localDir') ??
      join(process.cwd(), 'uploads', 'profiles');
    this.portfolioDir = join(process.cwd(), 'uploads', 'portfolio');
    this.chatDir = join(process.cwd(), 'uploads', 'chat');
    const apiBase =
      configService.get<string>('storage.publicBaseUrl') ??
      'http://localhost:4000/uploads/profiles';
    this.profileBaseUrl = apiBase.replace(/\/$/, '');
    this.portfolioBaseUrl =
      configService.get<string>('storage.portfolioPublicBaseUrl') ??
      'http://localhost:4000/uploads/portfolio';
    this.chatBaseUrl =
      configService.get<string>('storage.chatPublicBaseUrl') ??
      'http://localhost:4000/uploads/chat';
  }

  async uploadProfileImage(
    userId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    validateImageUpload(file, PROFILE_MIME_TYPES, PROFILE_MAX_SIZE);
    const webp = await toProfileWebp(file.buffer);
    const key = buildProfileObjectKey(userId);
    const relative = key.replace(/^profile-images\//, '');
    const [segmentUserId, filename] = relative.split('/');
    const userDir = join(this.profileDir, segmentUserId);
    await mkdir(userDir, { recursive: true });
    await writeFile(join(userDir, filename), webp);
    return `${this.profileBaseUrl}/${segmentUserId}/${filename}`;
  }

  async uploadPortfolioImage(
    userId: string,
    portfolioItemId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    validateImageUpload(file, PORTFOLIO_MIME_TYPES, PORTFOLIO_MAX_SIZE);
    const webp = await toPortfolioWebp(file.buffer);
    const key = buildPortfolioObjectKey(userId, portfolioItemId);
    const relative = key.replace(/^portfolio\//, '');
    const parts = relative.split('/');
    const itemDir = join(this.portfolioDir, ...parts.slice(0, -1));
    const filename = parts[parts.length - 1]!;
    await mkdir(itemDir, { recursive: true });
    await writeFile(join(itemDir, filename), webp);
    return `${this.portfolioBaseUrl}/${relative}`;
  }

  async uploadChatFile(
    userId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    validateChatUpload(file);
    const key = buildChatObjectKey(userId, file.originalname);
    const relative = key.replace(/^chat\//, '');
    const [segmentUserId, filename] = relative.split('/');
    const userDir = join(this.chatDir, segmentUserId!);
    await mkdir(userDir, { recursive: true });
    await writeFile(join(userDir, filename!), file.buffer);
    return `${this.chatBaseUrl}/${segmentUserId}/${filename}`;
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
      return;
    }

    const chatKey = objectKeyFromPublicUrl(url, this.chatBaseUrl);
    if (chatKey) {
      const relative = chatKey.replace(/^chat\//, '');
      await this.safeUnlink(join(this.chatDir, ...relative.split('/')));
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
