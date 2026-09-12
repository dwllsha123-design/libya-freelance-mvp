import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Request } from 'express';
import { extractClientIp } from './extract-client-ip.js';
import {
  DEFAULT_PRAYER_LOCATION,
  findCatalogCity,
  listCitiesForCountry,
  listCountriesFromCatalog,
  PRAYER_CITY_CATALOG,
} from './prayer-city-catalog.js';
import { IpApiGeolocationProvider } from './providers/ip-api.provider.js';
import type {
  IpGeolocationProvider,
  ResolvedLocation,
} from './location.types.js';

export const IP_GEOLOCATION_PROVIDER = Symbol('IP_GEOLOCATION_PROVIDER');

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);
  /** Short-lived in-memory cache keyed by hashed IP bucket (not raw IP). */
  private readonly cache = new Map<
    string,
    { expiresAt: number; value: ResolvedLocation }
  >();
  private readonly cacheTtlMs = 6 * 60 * 60 * 1000;

  constructor(
    @Inject(IP_GEOLOCATION_PROVIDER)
    private readonly geoProvider: IpGeolocationProvider,
  ) {}

  listCountries() {
    return listCountriesFromCatalog();
  }

  listCities(countryCode?: string) {
    if (!countryCode?.trim()) {
      return PRAYER_CITY_CATALOG.map((c) => ({
        countryCode: c.countryCode,
        country: c.country,
        countryAr: c.countryAr,
        city: c.city,
        cityAr: c.cityAr,
        latitude: c.latitude,
        longitude: c.longitude,
        timezone: c.timezone,
      }));
    }
    return listCitiesForCountry(countryCode).map((c) => ({
      countryCode: c.countryCode,
      country: c.country,
      countryAr: c.countryAr,
      city: c.city,
      cityAr: c.cityAr,
      latitude: c.latitude,
      longitude: c.longitude,
      timezone: c.timezone,
    }));
  }

  async resolveFromRequest(req: Request): Promise<ResolvedLocation> {
    const ip = extractClientIp(req);
    const cacheKey = ip ? cacheKeyForIp(ip) : 'anon';
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const resolved = await this.resolve(ip, req);
    this.cache.set(cacheKey, {
      expiresAt: Date.now() + this.cacheTtlMs,
      value: resolved,
    });
    return resolved;
  }

  /**
   * Testable resolution pipeline without Express request.
   * IP is used transiently and never persisted.
   */
  async resolve(
    ip: string | null,
    req?: Pick<Request, 'headers'>,
  ): Promise<ResolvedLocation> {
    if (ip) {
      try {
        const lookup = await this.geoProvider.lookup(ip);
        if (lookup) {
          const catalog = findCatalogCity({
            countryCode: lookup.countryCode,
            city: lookup.city,
            timezone: lookup.timezone,
          });
          if (catalog) {
            return {
              countryCode: catalog.countryCode,
              country: catalog.country,
              city: catalog.city,
              region: lookup.region ?? catalog.city,
              latitude: lookup.latitude ?? catalog.latitude,
              longitude: lookup.longitude ?? catalog.longitude,
              timezone: lookup.timezone ?? catalog.timezone,
              source: 'IP',
            };
          }
          if (
            typeof lookup.latitude === 'number' &&
            typeof lookup.longitude === 'number'
          ) {
            return {
              countryCode: lookup.countryCode,
              country: lookup.country,
              city: lookup.city ?? lookup.country,
              region: lookup.region,
              latitude: lookup.latitude,
              longitude: lookup.longitude,
              timezone: lookup.timezone ?? 'UTC',
              source: 'IP',
            };
          }
        }
      } catch (err) {
        this.logger.warn(
          `IP geolocation failed: ${err instanceof Error ? err.message : 'unknown'}`,
        );
      }
    }

    const headerCountry = readCountryHeader(req?.headers);
    if (headerCountry) {
      const catalog = findCatalogCity({ countryCode: headerCountry });
      if (catalog) {
        return toResolved(catalog, 'HEADER');
      }
    }

    return toResolved(DEFAULT_PRAYER_LOCATION, 'DEFAULT');
  }

  resolveManual(countryCode: string, city: string): ResolvedLocation {
    const catalog =
      findCatalogCity({ countryCode, city }) ??
      findCatalogCity({ countryCode }) ??
      DEFAULT_PRAYER_LOCATION;
    return toResolved(catalog, 'MANUAL');
  }
}

function toResolved(
  catalog: (typeof DEFAULT_PRAYER_LOCATION),
  source: ResolvedLocation['source'],
): ResolvedLocation {
  return {
    countryCode: catalog.countryCode,
    country: catalog.country,
    city: catalog.city,
    region: catalog.city,
    latitude: catalog.latitude,
    longitude: catalog.longitude,
    timezone: catalog.timezone,
    source,
  };
}

function readCountryHeader(
  headers?: Request['headers'],
): string | null {
  if (!headers) return null;
  const cf = headers['cf-ipcountry'];
  if (typeof cf === 'string' && /^[A-Za-z]{2}$/.test(cf) && cf.toUpperCase() !== 'XX') {
    return cf.toUpperCase();
  }
  const railway = headers['x-vercel-ip-country'] ?? headers['cloudfront-viewer-country'];
  if (typeof railway === 'string' && /^[A-Za-z]{2}$/.test(railway)) {
    return railway.toUpperCase();
  }
  return null;
}

/** Bucket IP for cache key — do not store raw visitor IPs. */
function cacheKeyForIp(ip: string): string {
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `v4:${parts[0]}.${parts[1]}.${parts[2]}.x`;
  }
  // IPv6: keep /48-ish prefix only
  const hextets = ip.split(':').filter(Boolean);
  return `v6:${hextets.slice(0, 3).join(':')}`;
}

export { IpApiGeolocationProvider };
