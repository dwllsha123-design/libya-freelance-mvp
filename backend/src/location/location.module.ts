import { Module } from '@nestjs/common';
import { LocationController } from './location.controller.js';
import {
  IP_GEOLOCATION_PROVIDER,
  LocationService,
} from './location.service.js';
import { IpApiGeolocationProvider } from './providers/ip-api.provider.js';

@Module({
  controllers: [LocationController],
  providers: [
    LocationService,
    IpApiGeolocationProvider,
    {
      provide: IP_GEOLOCATION_PROVIDER,
      useExisting: IpApiGeolocationProvider,
    },
  ],
  exports: [LocationService],
})
export class LocationModule {}
