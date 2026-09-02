import { Module } from '@nestjs/common';
import { NuqatiController } from './nuqati.controller.js';
import { NuqatiService } from './nuqati.service.js';

@Module({
  controllers: [NuqatiController],
  providers: [NuqatiService],
  exports: [NuqatiService],
})
export class NuqatiModule {}
