import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LocalStorageService } from './local-storage.service.js';
import { MediaController } from './media.controller.js';
import { S3StorageService } from './s3-storage.service.js';
import { STORAGE_SERVICE } from './storage.interface.js';

export function resolveStorageDriver(configService: ConfigService): 'local' | 's3' {
  const driver = (
    configService.get<string>('storage.driver') ?? 'local'
  ).toLowerCase();

  if (driver !== 'local' && driver !== 's3') {
    throw new Error(
      `Invalid STORAGE_DRIVER="${driver}". Allowed values: local, s3`,
    );
  }

  const nodeEnv = process.env.NODE_ENV ?? 'development';
  if (nodeEnv === 'production' && driver !== 's3') {
    throw new Error(
      'Production requires STORAGE_DRIVER=s3. Local disk storage is not permitted in production.',
    );
  }

  return driver;
}

@Module({
  imports: [ConfigModule],
  controllers: [MediaController],
  providers: [
    {
      provide: STORAGE_SERVICE,
      useFactory: (configService: ConfigService) => {
        const driver = resolveStorageDriver(configService);
        if (driver === 's3') {
          return new S3StorageService(configService);
        }
        return new LocalStorageService(configService);
      },
      inject: [ConfigService],
    },
    LocalStorageService,
  ],
  exports: [STORAGE_SERVICE, LocalStorageService],
})
export class StorageModule {}
