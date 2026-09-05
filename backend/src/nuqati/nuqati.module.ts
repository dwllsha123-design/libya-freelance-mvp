import { Module, forwardRef } from '@nestjs/common';
import { NuqatiController } from './nuqati.controller.js';
import { NuqatiService } from './nuqati.service.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [forwardRef(() => NotificationsModule)],
  controllers: [NuqatiController],
  providers: [NuqatiService],
  exports: [NuqatiService],
})
export class NuqatiModule {}
