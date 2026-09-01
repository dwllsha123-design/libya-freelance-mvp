import { Module } from '@nestjs/common';
import { LocalStorageService } from './local-storage.service.js';
import { STORAGE_SERVICE } from './storage.interface.js';

@Module({
  providers: [
    LocalStorageService,
    {
      provide: STORAGE_SERVICE,
      useExisting: LocalStorageService,
    },
  ],
  exports: [STORAGE_SERVICE, LocalStorageService],
})
export class StorageModule {}
