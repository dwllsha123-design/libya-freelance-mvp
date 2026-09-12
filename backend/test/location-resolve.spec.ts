import { describe, expect, it, vi } from 'vitest';
import { LocationService } from '../src/location/location.service.js';
import type { IpGeolocationProvider } from '../src/location/location.types.js';
import { isPrivateOrLocalIp } from '../src/location/providers/ip-api.provider.js';
import { extractClientIp } from '../src/location/extract-client-ip.js';

describe('LocationService prayer resolution', () => {
  it('resolves Libya/Tripoli from IP provider', async () => {
    const provider: IpGeolocationProvider = {
      name: 'mock',
      lookup: vi.fn().mockResolvedValue({
        countryCode: 'LY',
        country: 'Libya',
        city: 'Tripoli',
        region: 'Tripoli',
        latitude: 32.88,
        longitude: 13.19,
        timezone: 'Africa/Tripoli',
      }),
    };
    const service = new LocationService(provider);
    const resolved = await service.resolve('1.2.3.4');
    expect(resolved.countryCode).toBe('LY');
    expect(resolved.city).toBe('Tripoli');
    expect(resolved.source).toBe('IP');
    expect(resolved.latitude).toBeCloseTo(32.88, 1);
  });

  it('resolves another Libyan city (Benghazi)', async () => {
    const provider: IpGeolocationProvider = {
      name: 'mock',
      lookup: vi.fn().mockResolvedValue({
        countryCode: 'LY',
        country: 'Libya',
        city: 'Benghazi',
        region: 'Benghazi',
        latitude: 32.1,
        longitude: 20.0,
        timezone: 'Africa/Tripoli',
      }),
    };
    const service = new LocationService(provider);
    const resolved = await service.resolve('8.8.8.8');
    expect(resolved.city).toBe('Benghazi');
    expect(resolved.countryCode).toBe('LY');
  });

  it('resolves a foreign country capital from catalog', async () => {
    const provider: IpGeolocationProvider = {
      name: 'mock',
      lookup: vi.fn().mockResolvedValue({
        countryCode: 'EG',
        country: 'Egypt',
        city: 'Giza',
        region: 'Giza',
        latitude: 30.0,
        longitude: 31.2,
        timezone: 'Africa/Cairo',
      }),
    };
    const service = new LocationService(provider);
    const resolved = await service.resolve('9.9.9.9');
    expect(resolved.countryCode).toBe('EG');
    expect(resolved.city).toBe('Cairo');
    expect(resolved.source).toBe('IP');
  });

  it('falls back to default when provider fails / unknown IP', async () => {
    const provider: IpGeolocationProvider = {
      name: 'mock',
      lookup: vi.fn().mockResolvedValue(null),
    };
    const service = new LocationService(provider);
    const resolved = await service.resolve('203.0.113.10');
    expect(resolved.city).toBe('Tripoli');
    expect(resolved.countryCode).toBe('LY');
    expect(resolved.source).toBe('DEFAULT');
  });

  it('uses CF-IPCountry header when IP lookup fails', async () => {
    const provider: IpGeolocationProvider = {
      name: 'mock',
      lookup: vi.fn().mockResolvedValue(null),
    };
    const service = new LocationService(provider);
    const resolved = await service.resolve('203.0.113.10', {
      headers: { 'cf-ipcountry': 'SA' },
    } as never);
    expect(resolved.countryCode).toBe('SA');
    expect(resolved.city).toBe('Riyadh');
    expect(resolved.source).toBe('HEADER');
  });

  it('manual selection returns MANUAL source', () => {
    const provider: IpGeolocationProvider = {
      name: 'mock',
      lookup: vi.fn(),
    };
    const service = new LocationService(provider);
    const resolved = service.resolveManual('LY', 'Misrata');
    expect(resolved.city).toBe('Misrata');
    expect(resolved.source).toBe('MANUAL');
  });
});

describe('extractClientIp / private IP', () => {
  it('detects private IPs', () => {
    expect(isPrivateOrLocalIp('127.0.0.1')).toBe(true);
    expect(isPrivateOrLocalIp('10.0.0.5')).toBe(true);
    expect(isPrivateOrLocalIp('192.168.1.1')).toBe(true);
    expect(isPrivateOrLocalIp('8.8.8.8')).toBe(false);
  });

  it('prefers Express req.ip', () => {
    const ip = extractClientIp({
      ip: '203.0.113.50',
      headers: { 'x-forwarded-for': '1.1.1.1, 2.2.2.2' },
      socket: { remoteAddress: '10.0.0.1' },
    } as never);
    expect(ip).toBe('203.0.113.50');
  });
});
