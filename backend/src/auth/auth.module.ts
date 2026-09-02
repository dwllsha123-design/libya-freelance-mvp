import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { UsersModule } from '../users/users.module.js';
import { NuqatiModule } from '../nuqati/nuqati.module.js';
import { PlatformModule } from '../platform/platform.module.js';
import { EmailService } from '../common/services/email.service.js';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}),
    UsersModule,
    NuqatiModule,
    PlatformModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, EmailService],
  exports: [AuthService],
})
export class AuthModule {}