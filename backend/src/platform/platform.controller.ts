import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator.js';
import { PlatformService } from './platform.service.js';
import { PlatformPolicyService } from './platform-policy.service.js';
import { PlatformCmsService } from './platform-cms.service.js';

@Controller('platform')
export class PlatformController {
  constructor(
    private readonly platformService: PlatformService,
    private readonly policy: PlatformPolicyService,
    private readonly cms: PlatformCmsService,
  ) {}

  @Public()
  @Get('site-config')
  getSiteConfig() {
    return this.policy.getPublicSnapshot();
  }

  @Public()
  @Get('cms')
  getCms() {
    return this.cms.getPublicCms();
  }

  @Public()
  @Get('banners')
  getBanners() {
    return this.cms.getActiveBanners();
  }

  @Public()
  @Get('featured')
  getFeatured() {
    return this.cms.getFeatured();
  }

  @Public()
  @Get('stats')
  getStats() {
    return this.platformService.getPublicStats();
  }

  @Public()
  @Get('payment-config')
  getPaymentConfig() {
    return this.platformService.getPaymentConfig();
  }

  @Public()
  @Get('commission-config')
  getCommissionConfig() {
    return this.platformService.getCommissionConfig();
  }

  @Public()
  @Get('commission-preview')
  preview(
    @Query('projectId') projectId?: string,
    @Query('projectValue') projectValue?: string,
    @Query('commissionPercent') commissionPercent?: string,
    @Query('investorSharePercent') investorSharePercent?: string,
  ) {
    return this.platformService.previewCommission({
      projectId,
      projectValue: Number(projectValue ?? 1000),
      commissionPercent:
        commissionPercent != null && commissionPercent !== ''
          ? Number(commissionPercent)
          : undefined,
      investorSharePercent:
        investorSharePercent != null && investorSharePercent !== ''
          ? Number(investorSharePercent)
          : undefined,
    });
  }

  @Public()
  @Post('commission-preview')
  previewPost(
    @Body()
    body: {
      projectId?: string;
      projectValue: number;
      commissionPercent?: number;
      investorSharePercent?: number;
    },
  ) {
    return this.platformService.previewCommission(body);
  }
}
