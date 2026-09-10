import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { EscrowModule } from '../escrow/escrow.module.js';
import { NuqatiModule } from '../nuqati/nuqati.module.js';
import { PlatformModule } from '../platform/platform.module.js';
import { BadgesModule } from '../badges/badges.module.js';
import { LaunchModule } from '../launch/launch.module.js';
import { AgreementsModule } from '../agreements/agreements.module.js';
import { ProjectsController } from './projects.controller.js';
import { ProjectsService } from './projects.service.js';

@Module({
  imports: [
    NotificationsModule,
    EscrowModule,
    NuqatiModule,
    PlatformModule,
    BadgesModule,
    LaunchModule,
    AgreementsModule,
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
