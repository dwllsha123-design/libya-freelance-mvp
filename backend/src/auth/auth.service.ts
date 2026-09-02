import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role, UserStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PUBLIC_ROLES } from './constants.js';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { RealtimeSessionService } from '../realtime/realtime-session.service.js';
import { NuqatiService } from '../nuqati/nuqati.service.js';
import { UsersService } from '../users/users.service.js';
import { EmailService } from '../common/services/email.service.js';
import { PlatformPolicyService } from '../platform/platform-policy.service.js';
import { assertUserCanAuthenticate } from '../common/utils/account-status.util.js';
import {
  generateSecureToken,
  hashToken,
  parseDurationToMs,
} from '../common/utils/token.util.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';
import type {
  ResetPasswordDto,
  VerifyEmailDto,
} from './dto/password.dto.js';
import type {
  AuthTokens,
  JwtPayload,
  SafeUser,
} from './types/auth-user.type.js';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly realtimeSessions: RealtimeSessionService,
    private readonly nuqatiService: NuqatiService,
    private readonly platformPolicy: PlatformPolicyService,
  ) {}

  async register(dto: RegisterDto): Promise<{ user: SafeUser; tokens: AuthTokens }> {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('كلمتا المرور غير متطابقتين');
    }

    if (!PUBLIC_ROLES.includes(dto.role)) {
      throw new BadRequestException('نوع الحساب غير صالح');
    }

    await this.platformPolicy.assertRegistrationAllowed(dto.role);

    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });

    if (existing) {
      throw new ConflictException('البريد الإلكتروني مستخدم بالفعل');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const username = await this.usersService.generateUniqueUsername(
      dto.firstName,
      dto.lastName,
    );

    const user = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          role: dto.role,
          status: UserStatus.ACTIVE,
          emailVerified: false,
          profile: {
            create: {
              firstName: dto.firstName.trim(),
              lastName: dto.lastName.trim(),
              username,
            },
          },
        },
        include: {
          profile: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true,
            },
          },
        },
      });

      const profileId = createdUser.profile!.id;

      if (dto.role === Role.FREELANCER) {
        await tx.freelancerProfile.create({ data: { profileId } });
        await this.nuqatiService.onFreelancerRegistered(createdUser.id, tx);
      } else if (dto.role === Role.CLIENT) {
        await tx.clientProfile.create({ data: { profileId } });
      }

      return createdUser;
    });

    await this.createEmailVerificationToken(user.id, user.email);
    const tokens = await this.issueTokens(user);

    return {
      user: this.toSafeUser(user),
      tokens,
    };
  }

  async login(dto: LoginDto): Promise<{ user: SafeUser; tokens: AuthTokens }> {
    const email = dto.email.toLowerCase().trim();
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('بيانات الدخول غير صحيحة');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!passwordValid) {
      throw new UnauthorizedException('بيانات الدخول غير صحيحة');
    }

    assertUserCanAuthenticate(user.status);

    const tokens = await this.issueTokens(user);

    if (user.role === Role.FREELANCER) {
      void this.nuqatiService.onFreelancerLogin(user.id).catch(() => undefined);
    }

    return {
      user: this.toSafeUser(user),
      tokens,
    };
  }

  async refresh(refreshToken: string | undefined): Promise<AuthTokens> {
    if (!refreshToken) {
      throw new UnauthorizedException('رمز التحديث مفقود');
    }

    let payload: { sub: string; type?: string };

    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('رمز التحديث غير صالح أو منتهي');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('رمز التحديث غير صالح');
    }

    const tokenHash = hashToken(refreshToken);
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            profile: {
              select: {
                firstName: true,
                lastName: true,
                username: true,
              },
            },
          },
        },
      },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('رمز التحديث غير صالح أو منتهي');
    }

    assertUserCanAuthenticate(storedToken.user.status);

    await this.prisma.refreshToken.delete({ where: { id: storedToken.id } });

    return this.issueTokens(storedToken.user);
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) {
      return;
    }

    const tokenHash = hashToken(refreshToken);

    await this.prisma.refreshToken.deleteMany({
      where: { tokenHash },
    });
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return {
        message:
          'إذا كان البريد الإلكتروني مسجلاً، ستتلقى رابط إعادة تعيين كلمة المرور',
      };
    }

    const rawToken = generateSecureToken();
    const tokenHash = hashToken(rawToken);
    const expiresIn =
      this.configService.get<string>('tokens.passwordResetExpiresIn') ?? '1h';
    const expiresAt = new Date(Date.now() + parseDurationToMs(expiresIn));

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    await this.emailService.sendPasswordResetEmail(user.email, rawToken);

    return {
      message:
        'إذا كان البريد الإلكتروني مسجلاً، ستتلقى رابط إعادة تعيين كلمة المرور',
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('كلمتا المرور غير متطابقتين');
    }

    const tokenHash = hashToken(dto.token);
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (
      !resetToken ||
      resetToken.usedAt ||
      resetToken.expiresAt < new Date()
    ) {
      throw new BadRequestException('رمز إعادة التعيين غير صالح أو منتهي');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshToken.deleteMany({
        where: { userId: resetToken.userId },
      }),
    ]);

    await this.realtimeSessions.disconnectUser(resetToken.userId);

    return { message: 'تم تحديث كلمة المرور بنجاح' };
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<{ message: string }> {
    const tokenHash = hashToken(dto.token);
    const verificationToken =
      await this.prisma.emailVerificationToken.findUnique({
        where: { tokenHash },
        include: { user: true },
      });

    if (
      !verificationToken ||
      verificationToken.usedAt ||
      verificationToken.expiresAt < new Date()
    ) {
      throw new BadRequestException('رمز التحقق غير صالح أو منتهي');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: verificationToken.userId },
        data: {
          emailVerified: true,
        },
      }),
      this.prisma.emailVerificationToken.update({
        where: { id: verificationToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { message: 'تم التحقق من البريد الإلكتروني بنجاح' };
  }

  async getMe(userId: string): Promise<SafeUser> {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException('المستخدم غير موجود');
    }

    return this.toSafeUser(user);
  }

  private async issueTokens(user: {
    id: string;
    email: string;
    role: Role;
    status: UserStatus;
    emailVerified: boolean;
  }): Promise<AuthTokens> {
    const accessPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      type: 'access',
    };

    const refreshPayload = {
      sub: user.id,
      type: 'refresh' as const,
      jti: randomUUID(),
    };

    const accessExpiresIn = (this.configService.get<string>('jwt.accessExpiresIn') ??
      '15m') as `${number}${'s' | 'm' | 'h' | 'd'}`;

    const refreshExpiresIn = (this.configService.get<string>('jwt.refreshExpiresIn') ??
      '7d') as `${number}${'s' | 'm' | 'h' | 'd'}`;

    const accessToken = await this.jwtService.signAsync(accessPayload, {
      secret: this.configService.getOrThrow<string>('jwt.accessSecret'),
      expiresIn: accessExpiresIn,
    });

    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
      expiresIn: refreshExpiresIn,
    });

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + parseDurationToMs(refreshExpiresIn)),
      },
    });

    return { accessToken, refreshToken };
  }

  private async createEmailVerificationToken(
    userId: string,
    email: string,
  ): Promise<void> {
    const rawToken = generateSecureToken();
    const tokenHash = hashToken(rawToken);
    const expiresIn =
      this.configService.get<string>('tokens.emailVerificationExpiresIn') ??
      '24h';

    await this.prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + parseDurationToMs(expiresIn)),
      },
    });

    await this.emailService.sendVerificationEmail(email, rawToken);
  }

  private toSafeUser(user: {
    id: string;
    email: string;
    role: Role;
    status: UserStatus;
    emailVerified: boolean;
    createdAt: Date;
    profile?: {
      firstName: string;
      lastName: string;
      username: string;
    } | null;
  }): SafeUser {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      profile: user.profile
        ? {
            firstName: user.profile.firstName,
            lastName: user.profile.lastName,
            username: user.profile.username,
          }
        : null,
    };
  }
}
