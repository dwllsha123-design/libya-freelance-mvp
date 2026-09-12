import { Injectable, Logger } from '@nestjs/common';
import type {
  IpGeolocationProvider,
  IpLookupResult,
} from '../location.types.js';

/**
 * Free server-side IP geolocation via ip-api.com (no API key).
 * Used only for approximate city/country — never stored as a permanent IP log.
 */
@Injectable()
export class IpApiGeolocationProvider implements IpGeolocationProvider {
  readonly name = 'ip-api';
  private readonly logger = new Logger(IpApiGeolocationProvider.name);

  async lookup(ip: string): Promise<IpLookupResult | null> {
    if (!ip || isPrivateOrLocalIp(ip)) {
      return null;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);

    try {
      const url = `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,message,country,countryCode,regionName,city,lat,lon,timezone`;
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) {
        this.logger.warn(`ip-api HTTP ${res.status}`);
        return null;
      }
      const data = (await res.json()) as {
        status?: string;
        message?: string;
        country?: string;
        countryCode?: string;
        regionName?: string;
        city?: string;
        lat?: number;
        lon?: number;
        timezone?: string;
      };
      if (data.status !== 'success' || !data.countryCode) {
        return null;
      }
      return {
        countryCode: data.countryCode.toUpperCase(),
        country: data.country ?? data.countryCode,
        city: data.city ?? null,
        region: data.regionName ?? null,
        latitude: typeof data.lat === 'number' ? data.lat : null,
        longitude: typeof data.lon === 'number' ? data.lon : null,
        timezone: data.timezone ?? null,
      };
    } catch (err) {
      this.logger.warn(
        `ip-api lookup failed: ${err instanceof Error ? err.message : 'unknown'}`,
      );
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}

export function isPrivateOrLocalIp(ip: string): boolean {
  const normalized = ip.replace(/^::ffff:/, '');
  if (
    normalized === '127.0.0.1' ||
    normalized === '::1' ||
    normalized === 'localhost' ||
    normalized === '0.0.0.0'
  ) {
    return true;
  }
  if (/^10\./.test(normalized)) return true;
  if (/^192\.168\./.test(normalized)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(normalized)) return true;
  if (/^fc/i.test(normalized) || /^fd/i.test(normalized)) return true;
  return false;
}
