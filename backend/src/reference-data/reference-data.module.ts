import { Module } from '@nestjs/common';
import { ReferenceDataService } from './reference-data.service.js';

@Module({
  providers: [ReferenceDataService],
  exports: [ReferenceDataService],
})
export class ReferenceDataModule {}
