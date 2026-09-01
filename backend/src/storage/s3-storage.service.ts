import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from '@aws-sdk/client-s3';
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

export interface S3StorageConfig {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string;
  forcePathStyle: boolean;
}

export function resolveS3StorageConfig(
  configService: ConfigService,
): S3StorageConfig {
  const bucket = configService.get<string>('storage.s3.bucket');
  const accessKeyId = configService.get<string>('storage.s3.accessKeyId');
  const secretAccessKey = configService.get<string>('storage.s3.secretAccessKey');
  const publicBaseUrl = configService.get<string>('storage.s3.publicBaseUrl');

  const missing: string[] = [];
  if (!bucket) missing.push('S3_BUCKET');
  if (!accessKeyId) missing.push('S3_ACCESS_KEY_ID');
  if (!secretAccessKey) missing.push('S3_SECRET_ACCESS_KEY');
  if (!publicBaseUrl) missing.push('S3_PUBLIC_BASE_URL');

  if (missing.length > 0) {
    throw new Error(
      `S3 storage configuration incomplete (STORAGE_DRIVER=s3): missing ${missing.join(', ')}`,
    );
  }

  return {
    endpoint: configService.get<string>('storage.s3.endpoint') || undefined,
    region: configService.get<string>('storage.s3.region') ?? 'auto',
    bucket: bucket!,
    accessKeyId: accessKeyId!,
    secretAccessKey: secretAccessKey!,
    publicBaseUrl: publicBaseUrl!.replace(/\/$/, ''),
    forcePathStyle:
      configService.get<string>('storage.s3.forcePathStyle') === 'true',
  };
}

@Injectable()
export class S3StorageService implements StorageService {
  private readonly logger = new Logger(S3StorageService.name);
  private readonly config: S3StorageConfig;
  private readonly client: S3Client;

  constructor(configService: ConfigService) {
    this.config = resolveS3StorageConfig(configService);
    const clientConfig: S3ClientConfig = {
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
      forcePathStyle: this.config.forcePathStyle,
    };

    if (this.config.endpoint) {
      clientConfig.endpoint = this.config.endpoint;
    }

    this.client = new S3Client(clientConfig);
    this.logger.log(
      `S3 storage ready (bucket=${this.config.bucket}, pathStyle=${this.config.forcePathStyle})`,
    );
  }

  async uploadProfileImage(
    userId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    validateImageUpload(file, PROFILE_MIME_TYPES, PROFILE_MAX_SIZE);
    const key = buildProfileObjectKey(userId, file.mimetype);
    await this.putObject(key, file.buffer, file.mimetype);
    return this.publicUrlForKey(key);
  }

  async uploadPortfolioImage(
    userId: string,
    portfolioItemId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    validateImageUpload(file, PORTFOLIO_MIME_TYPES, PORTFOLIO_MAX_SIZE);
    const key = buildPortfolioObjectKey(userId, portfolioItemId, file.mimetype);
    await this.putObject(key, file.buffer, file.mimetype);
    return this.publicUrlForKey(key);
  }

  async deleteFile(url: string): Promise<void> {
    const key = objectKeyFromPublicUrl(url, this.config.publicBaseUrl);
    if (!key) {
      this.logger.warn(`Skipping delete for non-S3 URL: ${url}`);
      return;
    }

    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
        }),
      );
    } catch (error) {
      this.logger.warn(`Failed to delete S3 object ${key}: ${String(error)}`);
    }
  }

  publicUrlForKey(key: string): string {
    return `${this.config.publicBaseUrl}/${key}`;
  }

  private async putObject(key: string, body: Buffer, contentType: string) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }
}
