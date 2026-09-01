import { describe, expect, it } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { resolveStorageDriver } from '../src/storage/storage.module.js';

function config(driver: string, nodeEnv = 'development') {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = nodeEnv;
  const service = {
    get: (key: string) => (key === 'storage.driver' ? driver : undefined),
  } as unknown as ConfigService;
  return { service, restore: () => { process.env.NODE_ENV = previous; } };
}

describe('resolveStorageDriver', () => {
  it('allows local in development', () => {
    const { service, restore } = config('local', 'development');
    expect(resolveStorageDriver(service)).toBe('local');
    restore();
  });

  it('requires s3 in production', () => {
    const { service, restore } = config('local', 'production');
    expect(() => resolveStorageDriver(service)).toThrow(/STORAGE_DRIVER=s3/);
    restore();
  });

  it('allows s3 in production', () => {
    const { service, restore } = config('s3', 'production');
    expect(resolveStorageDriver(service)).toBe('s3');
    restore();
  });
});
