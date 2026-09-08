import { Module, forwardRef } from '@nestjs/common';
import { NuqatiController } from './nuqati.controller.js';
import { NuqatiService } from './nuqati.service.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { LaunchModule } from '../launch/launch.module.js';

@Module({
  imports: [NotificationsModule, forwardRef(() => LaunchModule)],
  controllers: [NuqatiController],
  providers: [NuqatiService],
  exports: [NuqatiService],
})
export class NuqatiModule {}
