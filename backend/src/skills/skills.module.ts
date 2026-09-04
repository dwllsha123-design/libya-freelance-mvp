import { Module } from '@nestjs/common';
import { ReferenceDataModule } from '../reference-data/reference-data.module.js';
import { SkillsController } from './skills.controller.js';
import { SkillsService } from './skills.service.js';

@Module({
  imports: [ReferenceDataModule],
  controllers: [SkillsController],
  providers: [SkillsService],
  exports: [SkillsService],
})
export class SkillsModule {}
