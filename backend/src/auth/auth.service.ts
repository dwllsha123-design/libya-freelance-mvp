import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  DevicePlatform,
  Prisma,
  Role,
  UserStatus,
  ProductAnalyticsEventType,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { isPlatformRole, isStaffRole, PUBLIC_ROLES } from './constants.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RealtimeSessionService } from '../realtime/realtime-session.service.js';
import { NuqatiService } from '../nuqati/nuqati.service.js';
import { LaunchProgramService } from '../launch/launch.service.js';
import { UsersService } from '../users/users.service.js';
import { EmailService } from '../common/services/email.service.js';
import { PlatformPolicyService } from '../platform/platform-policy.service.js';
import { SubscriptionEntitlementService } from '../subscriptions/subscription-entitlement.service.js';
import { assertUserCanAuthenticate } from '../common/utils/account-status.util.js';
import {
  generateSecureToken,
  hashToken,
  parseDurationToMs,
} from '../common/utils/token.util.js';
import { hashPassword, verifyPassword } from './password.util.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';
import type { SwitchRoleDto } from './dto/switch-role.dto.js';
import type {
  ChangePasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from './dto/password.dto.js';
import type {
  AuthClientChannel,
  AuthSessionOptions,
  AuthTokens,
  IssuedAuthSession,
  JwtPayload,
  NativeDevicePlatform,
  RefreshJwtPayload,
  RegisterResult,
  SafeUser,
} from './types/auth-user.type.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly realtimeSessions: RealtimeSessionService,
    private readonly nuqatiService: NuqatiService,
    private readonly launchProgram: LaunchProgramService,
    private readonly platformPolicy: PlatformPolicyService,
    private readonly entitlements: SubscriptionEntitlementService,
  ) {}

  async register(dto: RegisterDto): Promise<RegisterResult> {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('كلمتا المرور غير متطابقتين');
    }

    if (!PUBLIC_ROLES.includes(dto.role)) {
      throw new BadRequestException('نوع الحساب غير صالح');
    }

    const session = this.resolveSessionOptions(dto);

    await this.platformPolicy.assertRegistrationAllowed(dto.role);

    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });

    if (existing) {
      throw new ConflictException('البريد الإلكتروني مستخدم بالفعل');
    }

    const bcryptStarted = Date.now();
    const passwordHash = await hashPassword(dto.password);
    this.logger.debug(`register.timing bcryptMs=${Date.now() - bcryptStarted}`);

    const username = await this.usersService.generateUniqueUsername(
      dto.firstName,
      dto.lastName,
    );

    let user: Awaited<ReturnType<typeof this.createRegisteredUser>>;
    const txStarted = Date.now();
    try {
      user = await this.createRegisteredUser({
        email,
        passwordHash,
        role: dto.role,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        username,
      });
    } catch (error) {
      this.rethrowRegistrationUniqueConflict(error);
      throw error;
    }
    this.logger.debug(
      `register.timing dbTransactionMs=${Date.now() - txStarted} userId=${user.id}`,
    );

    // Account exists from here — never report creation failure for side effects.
    const verifyStarted = Date.now();
    await this.createEmailVerificationTokenBestEffort(user.id, user.email);
    this.logger.debug(
      `register.timing verificationTokenMs=${Date.now() - verifyStarted} userId=${user.id}`,
    );

    const sessionStarted = Date.now();
    try {
      const tokens = await this.issueTokens(user, session);
      this.logger.debug(
        `register.timing sessionMs=${Date.now() - sessionStarted} userId=${user.id}`,
      );

      void this.launchProgram
        .trackAnalytics(user.id, ProductAnalyticsEventType.SIGNUP_COMPLETED, {
          role: dto.role,
        })
        .catch(() => undefined);

      return {
        accountCreated: true,
        authenticated: true,
        user: this.toSafeUser(user),
        tokens,
        channel: session.channel,
      };
    } catch {
      this.logger.error(
        `register.sessionFailed after account commit userId=${user.id}`,
      );
      this.logger.debug(
        `register.timing sessionMs=${Date.now() - sessionStarted} failed=true userId=${user.id}`,
      );
      return {
        accountCreated: true,
        authenticated: false,
        requiresLogin: true,
        channel: session.channel,
      };
    }
  }

  private async createRegisteredUser(input: {
    email: string;
    passwordHash: string;
    role: Role;
    firstName: string;
    lastName: string;
    username: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: input.email,
          passwordHash: input.passwordHash,
          role: input.role,
          status: UserStatus.ACTIVE,
          emailVerified: false,
          profile: {
            create: {
              firstName: input.firstName,
              lastName: input.lastName,
              username: input.username,
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
              profilePhoto: true,
            },
          },
        },
      });

      const profileId = createdUser.profile!.id;

      if (input.role === Role.FREELANCER) {
        await tx.freelancerProfile.create({ data: { profileId } });
        await this.entitlements.grantRegistrationTrial(
          createdUser.id,
          createdUser.createdAt,
          tx,
        );
      } else if (input.role === Role.CLIENT) {
        await tx.clientProfile.create({ data: { profileId } });
      }

      await this.nuqatiService.awardWelcomeBonus(createdUser.id, tx);

      return createdUser;
    });
  }

  private rethrowRegistrationUniqueConflict(error: unknown): void {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== 'P2002'
    ) {
      return;
    }

    const target = error.meta?.target;
    const fields = Array.isArray(target)
      ? target.map(String)
      : [String(target ?? '')];

    if (fields.some((field) => field.toLowerCase().includes('email'))) {
      throw new ConflictException('البريد الإلكتروني مستخدم بالفعل');
    }

    // Username collision race — ask client to retry (account was not committed).
    throw new ConflictException(
      'تعذر إكمال التسجيل بسبب تعارض البيانات. حاول مرة أخرى.',
    );
  }

  async login(dto: LoginDto): Promise<IssuedAuthSession> {
    const email = dto.email.toLowerCase().trim();
    const user = await this.usersService.findByEmail(email);
    const session = this.resolveSessionOptions(dto);

    if (!user) {
      throw new UnauthorizedException('بيانات الدخول غير صحيحة');
    }

    const passwordValid = await verifyPassword(dto.password, user.passwordHash);

    if (!passwordValid) {
      throw new UnauthorizedException('بيانات الدخول غير صحيحة');
    }

    assertUserCanAuthenticate(user.status);

    const audience = dto.audience ?? 'platform';
    if (audience === 'admin') {
      if (!isStaffRole(user.role)) {
        throw new ForbiddenException(
          'حسابات المنصة لا يمكنها دخول لوحة الإدارة',
        );
      }
    } else if (isStaffRole(user.role)) {
      throw new ForbiddenException(
        'هذا حساب إداري. استخدم لوحة الإدارة.',
      );
    } else if (!isPlatformRole(user.role)) {
      throw new ForbiddenException('نوع الحساب غير صالح لتسجيل الدخول');
    }

    const tokens = await this.issueTokens(user, session);

    if (user.role === Role.FREELANCER) {
      void this.nuqatiService.onFreelancerLogin(user.id).catch(() => undefined);
    }

    return {
      user: this.toSafeUser(user),
      tokens,
      channel: session.channel,
    };
  }

  /**
   * Rotate a refresh token.
   * Web clients send the token via HttpOnly cookie; native via JSON body.
   * Reuse of an already-rotated token revokes the affected session family.
   */
  async refresh(
    refreshToken: string | undefined,
    delivery: AuthClientChannel = 'web',
  ): Promise<AuthTokens & { channel: AuthClientChannel }> {
    if (!refreshToken) {
      throw new UnauthorizedException('رمز التحديث مفقود');
    }

    let payload: RefreshJwtPayload;

    try {
      payload = await this.jwtService.verifyAsync<RefreshJwtPayload>(
        refreshToken,
        {
          secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
        },
      );
    } catch {
      throw new UnauthorizedException('رمز التحديث غير صالح أو منتهي');
    }

    if (payload.type !== 'refresh' || !payload.sub) {
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
                profilePhoto: true,
              },
            },
          },
        },
      },
    });

    if (!storedToken) {
      // Likely reuse of a rotated/revoked token — revoke the session family.
      await this.revokeSessionFamily(payload);
      throw new UnauthorizedException('رمز التحديث غير صالح أو منتهي');
    }

    if (storedToken.expiresAt < new Date()) {
      await this.prisma.refreshToken.delete({ where: { id: storedToken.id } });
      throw new UnauthorizedException('رمز التحديث غير صالح أو منتهي');
    }

    assertUserCanAuthenticate(storedToken.user.status);

    const deviceId = storedToken.deviceId ?? payload.did ?? undefined;
    const channel: AuthClientChannel =
      delivery === 'native' || deviceId ? 'native' : 'web';

    if (delivery === 'native' && !deviceId) {
      // Body refresh presented a web (cookie-era) token — still rotate, but
      // do not invent a device link. Caller may receive refresh in body once.
    }

    await this.prisma.refreshToken.delete({ where: { id: storedToken.id } });

    const tokens = await this.issueTokens(storedToken.user, {
      channel,
      existingDeviceId: deviceId,
    });

    return { ...tokens, channel };
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) {
      return;
    }

    const tokenHash = hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      select: { id: true, deviceId: true, userId: true },
    });

    if (!stored) {
      return;
    }

    await this.prisma.refreshToken.deleteMany({
      where: { id: stored.id },
    });

    if (stored.deviceId) {
      await this.prisma.userDevice.updateMany({
        where: { id: stored.deviceId, userId: stored.userId },
        data: { isActive: false },
      });
    }
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

    try {
      await this.emailService.sendPasswordResetEmail(user.email, rawToken);
    } catch {
      // Preserve account-enumeration protection: always return the same message.
      // EmailService already logged a safe generic failure (no tokens/secrets).
    }

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

    const passwordHash = await hashPassword(dto.password);

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

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    if (dto.newPassword !== dto.confirmNewPassword) {
      throw new BadRequestException('كلمتا المرور الجديدتان غير متطابقتين');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(
        'كلمة المرور الجديدة يجب أن تختلف عن الحالية',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true, status: true },
    });

    if (!user) {
      throw new UnauthorizedException('المستخدم غير موجود');
    }

    assertUserCanAuthenticate(user.status);

    const currentValid = await verifyPassword(
      dto.currentPassword,
      user.passwordHash,
    );
    if (!currentValid) {
      throw new BadRequestException('كلمة المرور الحالية غير صحيحة');
    }

    const passwordHash = await hashPassword(dto.newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash,
          mustChangePassword: false,
        },
      }),
      this.prisma.refreshToken.deleteMany({
        where: { userId },
      }),
    ]);

    await this.realtimeSessions.disconnectUser(userId);

    return { message: 'تم تغيير كلمة المرور بنجاح. يرجى تسجيل الدخول مجددًا.' };
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

    await this.launchProgram
      .evaluateFoundingFreelancer(verificationToken.userId)
      .catch(() => undefined);

    return { message: 'تم التحقق من البريد الإلكتروني بنجاح' };
  }

  async getMe(userId: string): Promise<SafeUser> {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException('المستخدم غير موجود');
    }

    return this.toSafeUser(user);
  }

  async switchRole(
    userId: string,
    dto: SwitchRoleDto,
  ): Promise<IssuedAuthSession> {
    if (!PUBLIC_ROLES.includes(dto.role)) {
      throw new BadRequestException('يمكن التبديل بين وضع العميل والمستقل فقط');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            profilePhoto: true,
            freelancerProfile: { select: { id: true } },
            clientProfile: { select: { id: true, displayName: true } },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('المستخدم غير موجود');
    }

    if (!PUBLIC_ROLES.includes(user.role)) {
      throw new BadRequestException('لا يمكن تبديل وضع حسابات الإدارة');
    }

    assertUserCanAuthenticate(user.status);

    if (!user.profile) {
      throw new BadRequestException('الملف الشخصي غير مكتمل');
    }

    if (user.role !== dto.role) {
      await this.prisma.$transaction(async (tx) => {
        if (dto.role === Role.FREELANCER && !user.profile!.freelancerProfile) {
          await tx.freelancerProfile.create({
            data: { profileId: user.profile!.id },
          });
          await this.nuqatiService.awardWelcomeBonus(user.id, tx);
        }

        if (dto.role === Role.CLIENT && !user.profile!.clientProfile) {
          await tx.clientProfile.create({
            data: {
              profileId: user.profile!.id,
              displayName: `${user.profile!.firstName} ${user.profile!.lastName}`.trim(),
            },
          });
        }

        await tx.user.update({
          where: { id: user.id },
          data: { role: dto.role },
        });
      });
    }

    const refreshed = await this.usersService.findById(userId);
    if (!refreshed) {
      throw new UnauthorizedException('المستخدم غير موجود');
    }

    // switch-role remains a web marketplace flow (HttpOnly cookie delivery).
    const tokens = await this.issueTokens(refreshed, { channel: 'web' });

    if (dto.role === Role.FREELANCER) {
      void this.nuqatiService.onFreelancerLogin(userId).catch(() => undefined);
    }

    return {
      user: this.toSafeUser(refreshed),
      tokens,
      channel: 'web',
    };
  }

  /**
   * Resolve client channel metadata. Defaults to web for backward compatibility.
   * clientChannel is never used as authorization.
   */
  resolveSessionOptions(input: {
    clientChannel?: 'web' | 'native';
    platform?: NativeDevicePlatform;
    appVersion?: string;
  }): AuthSessionOptions {
    const channel = input.clientChannel === 'native' ? 'native' : 'web';

    if (channel === 'native') {
      if (input.platform !== 'IOS' && input.platform !== 'ANDROID') {
        throw new BadRequestException(
          'يجب تحديد منصة IOS أو ANDROID لتطبيق الهاتف',
        );
      }

      return {
        channel,
        platform: input.platform,
        appVersion: input.appVersion?.trim() || undefined,
      };
    }

    return { channel: 'web' };
  }

  /**
   * On reuse of a rotated refresh JWT: revoke sibling sessions.
   * Native: all refresh rows for that UserDevice + deactivate device.
   * Web: all refresh rows for the user with null deviceId (cookie sessions).
   */
  private async revokeSessionFamily(payload: RefreshJwtPayload): Promise<void> {
    if (payload.did) {
      await this.prisma.$transaction([
        this.prisma.refreshToken.deleteMany({
          where: { deviceId: payload.did, userId: payload.sub },
        }),
        this.prisma.userDevice.updateMany({
          where: { id: payload.did, userId: payload.sub },
          data: { isActive: false },
        }),
      ]);
      return;
    }

    await this.prisma.refreshToken.deleteMany({
      where: { userId: payload.sub, deviceId: null },
    });
  }

  private async issueTokens(
    user: {
      id: string;
      email: string;
      role: Role;
      status: UserStatus;
      emailVerified: boolean;
    },
    session: AuthSessionOptions = { channel: 'web' },
  ): Promise<AuthTokens> {
    let deviceId = session.existingDeviceId;

    if (!deviceId && session.channel === 'native' && session.platform) {
      const device = await this.prisma.userDevice.create({
        data: {
          userId: user.id,
          platform:
            session.platform === 'IOS'
              ? DevicePlatform.IOS
              : DevicePlatform.ANDROID,
          appVersion: session.appVersion,
          isActive: true,
          lastActiveAt: new Date(),
        },
        select: { id: true },
      });
      deviceId = device.id;
    } else if (deviceId) {
      await this.prisma.userDevice.updateMany({
        where: { id: deviceId, userId: user.id },
        data: { lastActiveAt: new Date(), isActive: true },
      });
    }

    const accessPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      type: 'access',
    };

    const refreshPayload: RefreshJwtPayload = {
      sub: user.id,
      type: 'refresh',
      jti: randomUUID(),
      ...(deviceId ? { did: deviceId } : {}),
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
        deviceId: deviceId ?? null,
      },
    });

    return { accessToken, refreshToken };
  }

  /**
   * Persist verification token, then dispatch SMTP without blocking registration.
   * SMTP failures are logged and never fail account creation.
   */
  private async createEmailVerificationTokenBestEffort(
    userId: string,
    email: string,
  ): Promise<void> {
    const rawToken = generateSecureToken();
    const tokenHash = hashToken(rawToken);
    const expiresIn =
      this.configService.get<string>('tokens.emailVerificationExpiresIn') ??
      '24h';

    try {
      await this.prisma.emailVerificationToken.create({
        data: {
          userId,
          tokenHash,
          expiresAt: new Date(Date.now() + parseDurationToMs(expiresIn)),
        },
      });
    } catch {
      this.logger.error(
        `register.verificationTokenPersistFailed userId=${userId}`,
      );
      // Still try to continue registration/session; user can verify later via ops/resend.
      return;
    }

    const smtpStarted = Date.now();
    this.logger.debug(
      `register.timing smtpScheduleMs=0 userId=${userId}`,
    );
    void this.emailService
      .sendVerificationEmail(email, rawToken)
      .then(() => {
        this.logger.debug(
          `register.timing smtpDispatchMs=${Date.now() - smtpStarted} userId=${userId} ok=true`,
        );
      })
      .catch(() => {
        // EmailService already logs SMTP failure without secrets/tokens.
        this.logger.error(
          `register.verificationEmailDispatchFailed userId=${userId}`,
        );
        this.logger.debug(
          `register.timing smtpDispatchMs=${Date.now() - smtpStarted} userId=${userId} ok=false`,
        );
      });
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
      profilePhoto?: string | null;
      freelancerProfile?: { id: string } | null;
      clientProfile?: { id: string; displayName?: string | null } | null;
    } | null;
  }): SafeUser {
    const hasFreelancerProfile = Boolean(
      user.profile?.freelancerProfile ?? user.role === Role.FREELANCER,
    );
    const hasClientProfile = Boolean(
      user.profile?.clientProfile ?? user.role === Role.CLIENT,
    );

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      hasClientProfile,
      hasFreelancerProfile,
      clientDisplayName:
        user.profile?.clientProfile?.displayName?.trim() ||
        (hasClientProfile && user.profile
          ? `${user.profile.firstName} ${user.profile.lastName}`.trim()
          : null),
      profile: user.profile
        ? {
            firstName: user.profile.firstName,
            lastName: user.profile.lastName,
            username: user.profile.username,
            profilePhoto: user.profile.profilePhoto ?? null,
          }
        : null,
    };
  }
}
