import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { CommercialModule } from '../commercial/commercial.module.js';
import { AgreementsController } from './agreements.controller.js';
import { AgreementsService } from './agreements.service.js';

@Module({
  imports: [NotificationsModule, CommercialModule],
  controllers: [AgreementsController],
  providers: [AgreementsService],
  exports: [AgreementsService],
})
export class AgreementsModule {}
