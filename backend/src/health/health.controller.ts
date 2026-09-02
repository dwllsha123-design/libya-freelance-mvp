import {
  Controller,
  Get,
  Inject,
  Optional,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { Public } from '../common/decorators/public.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import type { AuthUser } from '../auth/types/auth-user.type.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { STORAGE_SERVICE, type StorageService } from '../storage/storage.interface.js';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Optional()
    @Inject(STORAGE_SERVICE)
    private readonly storage?: StorageService,
  ) {}

  @Public()
  @Get()
  health() {
    return {
      status: 'ok',
      service: 'libya-freelance-api',
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('ready')
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException({
        status: 'not_ready',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
      });
    }

    const storage = await this.checkStorageHealth();

    return {
      status: storage.ok ? 'ready' : 'degraded',
      database: 'connected',
      storage: storage.summary,
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('storage')
  async storageHealth() {
    const storage = await this.checkStorageHealth();
    if (!storage.ok) {
      throw new ServiceUnavailableException({
        status: 'storage_unavailable',
        storage: storage.summary,
        timestamp: new Date().toISOString(),
      });
    }
    return {
      status: 'ok',
      storage: storage.summary,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('protected')
  @UseGuards(JwtAuthGuard)
  protected(@CurrentUser() user: AuthUser) {
    return { message: 'authenticated', userId: user.id, role: user.role };
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  adminOnly() {
    return { message: 'admin access granted' };
  }

  /** Safe storage probe — no secrets, bucket names, or credentials */
  private async checkStorageHealth(): Promise<{
    ok: boolean;
    summary: { driver: string; reachable: boolean };
  }> {
    const driver = (
      this.config.get<string>('storage.driver') ?? 'local'
    ).toLowerCase();

    if (driver === 's3') {
      // Presence of injected storage service is enough; avoid credential leaks
      return {
        ok: Boolean(this.storage),
        summary: { driver: 's3', reachable: Boolean(this.storage) },
      };
    }

    const localDir =
      this.config.get<string>('storage.localDir') ??
      join(process.cwd(), 'uploads', 'profiles');
    const uploadsRoot = join(process.cwd(), 'uploads');

    try {
      await access(uploadsRoot);
      return { ok: true, summary: { driver: 'local', reachable: true } };
    } catch {
      try {
        await access(localDir);
        return { ok: true, summary: { driver: 'local', reachable: true } };
      } catch {
        return { ok: false, summary: { driver: 'local', reachable: false } };
      }
    }
  }
}
