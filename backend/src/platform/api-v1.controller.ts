import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator.js';
import { PlatformAppConfigService } from '../platform/platform-app-config.service.js';

/**
 * Versioned mobile-friendly surface.
 * Existing `/api/*` routes stay unchanged; new clients should prefer `/api/v1/*`.
 */
@Controller('v1')
export class ApiV1Controller {
  constructor(private readonly appConfig: PlatformAppConfigService) {}

  @Public()
  @Get('app-config')
  getAppConfig() {
    return this.appConfig.getPublicAppConfig();
  }
}
