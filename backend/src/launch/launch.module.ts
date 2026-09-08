import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { LaunchProgramService } from './launch.service.js';
import { LaunchController } from './launch.controller.js';

@Module({
  imports: [NotificationsModule],
  controllers: [LaunchController],
  providers: [LaunchProgramService],
  exports: [LaunchProgramService],
})
export class LaunchModule {}
