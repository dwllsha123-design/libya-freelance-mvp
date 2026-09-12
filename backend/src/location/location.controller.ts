import { Controller, Get, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../common/decorators/public.decorator.js';
import { LocationService } from './location.service.js';

@Controller('location')
export class LocationController {
  constructor(private readonly location: LocationService) {}

  @Public()
  @Get('resolve')
  resolve(@Req() req: Request) {
    return this.location.resolveFromRequest(req);
  }

  @Public()
  @Get('countries')
  countries() {
    return this.location.listCountries();
  }

  @Public()
  @Get('cities')
  cities(@Query('countryCode') countryCode?: string) {
    return this.location.listCities(countryCode);
  }
}
