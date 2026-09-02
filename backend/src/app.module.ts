import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import configuration from './config/configuration.js';
import { validate } from './config/validate.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { HealthController } from './health/health.controller.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { ProfilesModule } from './profiles/profiles.module.js';
import { SkillsModule } from './skills/skills.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { CitiesModule } from './cities/cities.module.js';
import { StorageModule } from './storage/storage.module.js';
import { ProjectsModule } from './projects/projects.module.js';
import { ProposalsModule } from './proposals/proposals.module.js';
import { MessagingModule } from './messaging/messaging.module.js';
import { PortfolioModule } from './portfolio/portfolio.module.js';
import { ReviewsModule } from './reviews/reviews.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { AdminModule } from './admin/admin.module.js';
import { ClientRequestGuard } from './common/guards/client-request.guard.js';
import { RealtimeModule } from './realtime/realtime.module.js';
import { PlatformModule } from './platform/platform.module.js';
import { EscrowModule } from './escrow/escrow.module.js';
import { PaymentsModule } from './payments/payment.module.js';
import { NuqatiModule } from './nuqati/nuqati.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
    }),
    PrismaModule,
    StorageModule,
    UsersModule,
    AuthModule,
    ProfilesModule,
    SkillsModule,
    CategoriesModule,
    CitiesModule,
    ProjectsModule,
    ProposalsModule,
    MessagingModule,
    PortfolioModule,
    ReviewsModule,
    NotificationsModule,
    AdminModule,
    RealtimeModule,
    PlatformModule,
    PaymentsModule,
    EscrowModule,
    NuqatiModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    ClientRequestGuard,
  ],
})
export class AppModule {}
