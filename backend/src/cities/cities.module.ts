import { Module } from '@nestjs/common';
import { ReferenceDataModule } from '../reference-data/reference-data.module.js';
import { CitiesController } from './cities.controller.js';
import { CitiesService } from './cities.service.js';

@Module({
  imports: [ReferenceDataModule],
  controllers: [CitiesController],
  providers: [CitiesService],
  exports: [CitiesService],
})
export class CitiesModule {}
