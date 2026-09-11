import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Public } from '../common/decorators/public.decorator.js';
import { ClientRequestGuard } from '../common/guards/client-request.guard.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { SwitchRoleDto } from './dto/switch-role.dto.js';
import {
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
  ChangePasswordDto,
} from './dto/password.dto.js';
import {
  LogoutSessionDto,
  RefreshSessionDto,
} from './dto/auth-session.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from './types/auth-user.type.js';
import {
  REFRESH_COOKIE,
  clearRefreshCookie,
  setRefreshCookie,
} from './auth-cookie.util.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @UseGuards(ClientRequestGuard)
  @Post('register')
  @HttpCode(201)
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(dto);

    if (!result.authenticated) {
      // Account exists; automatic session could not be established.
      return {
        accountCreated: true as const,
        authenticated: false as const,
        requiresLogin: true as const,
      };
    }

    const sessionBody = this.respondWithSession(res, result);
    return {
      accountCreated: true as const,
      authenticated: true as const,
      ...sessionBody,
    };
  }

  @Public()
  @UseGuards(ClientRequestGuard)
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);
    return this.respondWithSession(res, result);
  }

  @Public()
  @UseGuards(ClientRequestGuard)
  @Post('logout')
  @HttpCode(200)
  async logout(
    @Req() req: Request,
    @Body() dto: LogoutSessionDto = {},
    @Res({ passthrough: true }) res: Response,
  ) {
    const raw =
      dto?.refreshToken?.trim() ||
      (req.cookies?.[REFRESH_COOKIE] as string | undefined);

    await this.authService.logout(raw);
    clearRefreshCookie(res);
    return { message: 'تم تسجيل الخروج بنجاح' };
  }

  @Public()
  @UseGuards(ClientRequestGuard)
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Body() dto: RefreshSessionDto = {},
    @Res({ passthrough: true }) res: Response,
  ) {
    const bodyToken = dto?.refreshToken?.trim();
    const cookieToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    // Native: body token. Web: HttpOnly cookie. Body wins when both sent.
    const delivery = bodyToken ? 'native' : 'web';
    const raw = bodyToken || cookieToken;

    const tokens = await this.authService.refresh(raw, delivery);

    if (delivery === 'web') {
      setRefreshCookie(res, tokens.refreshToken);
      return { accessToken: tokens.accessToken };
    }

    // Native path: never require cookies; return rotating refresh for SecureStore.
    clearRefreshCookie(res);
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  @Public()
  @UseGuards(ClientRequestGuard)
  @Post('forgot-password')
  @HttpCode(200)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @UseGuards(ClientRequestGuard)
  @Post('reset-password')
  @HttpCode(200)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Public()
  @UseGuards(ClientRequestGuard)
  @Post('verify-email')
  @HttpCode(200)
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  @Post('change-password')
  @HttpCode(200)
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.changePassword(user.id, dto);
    clearRefreshCookie(res);
    return result;
  }

  @Get('me')
  getMe(@CurrentUser() user: AuthUser) {
    return this.authService.getMe(user.id);
  }

  @Post('switch-role')
  @HttpCode(200)
  async switchRole(
    @CurrentUser() user: AuthUser,
    @Body() dto: SwitchRoleDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.switchRole(user.id, dto);
    return this.respondWithSession(res, result);
  }

  /**
   * Web: set HttpOnly cookie; never expose refresh in JSON.
   * Native: return refresh in JSON for Keychain/Keystore/SecureStore; no cookie dependency.
   */
  private respondWithSession(
    res: Response,
    result: {
      user: unknown;
      tokens: { accessToken: string; refreshToken: string };
      channel: 'web' | 'native';
    },
  ) {
    if (result.channel === 'native') {
      clearRefreshCookie(res);
      return {
        user: result.user,
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
      };
    }

    setRefreshCookie(res, result.tokens.refreshToken);
    return {
      user: result.user,
      accessToken: result.tokens.accessToken,
    };
  }
}
