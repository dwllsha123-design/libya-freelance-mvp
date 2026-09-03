import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import configuration from '../src/config/configuration.js';

const S3_KEYS = [
  'S3_ENDPOINT',
  'S3_REGION',
  'S3_BUCKET',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY',
  'S3_FORCE_PATH_STYLE',
  'AWS_ENDPOINT_URL',
  'AWS_DEFAULT_REGION',
  'AWS_REGION',
  'AWS_S3_BUCKET_NAME',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_S3_URL_STYLE',
] as const;

describe('storage config: Railway AWS_* / VPS S3_* mapping', () => {
  let saved: Record<string, string | undefined>;

  beforeEach(() => {
    saved = {};
    for (const key of S3_KEYS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of S3_KEYS) {
      if (saved[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = saved[key];
      }
    }
  });

  it('reads Railway Bucket AWS_* variables', () => {
    process.env.AWS_ENDPOINT_URL = 'https://storage.railway.app';
    process.env.AWS_DEFAULT_REGION = 'auto';
    process.env.AWS_S3_BUCKET_NAME = 'bucket-abc123';
    process.env.AWS_ACCESS_KEY_ID = 'railway-key-id';
    process.env.AWS_SECRET_ACCESS_KEY = 'railway-secret';

    const { s3 } = configuration().storage;

    expect(s3.endpoint).toBe('https://storage.railway.app');
    expect(s3.region).toBe('auto');
    expect(s3.bucket).toBe('bucket-abc123');
    expect(s3.accessKeyId).toBe('railway-key-id');
    expect(s3.secretAccessKey).toBe('railway-secret');
  });

  it('still reads legacy S3_* variables (VPS / MinIO)', () => {
    process.env.S3_ENDPOINT = 'http://minio:9000';
    process.env.S3_REGION = 'us-east-1';
    process.env.S3_BUCKET = 'libya-freelance-prod';
    process.env.S3_ACCESS_KEY_ID = 'minio-key-id';
    process.env.S3_SECRET_ACCESS_KEY = 'minio-secret';

    const { s3 } = configuration().storage;

    expect(s3.endpoint).toBe('http://minio:9000');
    expect(s3.region).toBe('us-east-1');
    expect(s3.bucket).toBe('libya-freelance-prod');
    expect(s3.accessKeyId).toBe('minio-key-id');
    expect(s3.secretAccessKey).toBe('minio-secret');
  });

  it('prefers AWS_* when both naming schemes are present', () => {
    process.env.S3_BUCKET = 'legacy-bucket';
    process.env.S3_ACCESS_KEY_ID = 'legacy-key';
    process.env.AWS_S3_BUCKET_NAME = 'railway-bucket';
    process.env.AWS_ACCESS_KEY_ID = 'railway-key';

    const { s3 } = configuration().storage;

    expect(s3.bucket).toBe('railway-bucket');
    expect(s3.accessKeyId).toBe('railway-key');
  });

  it('falls back to AWS_REGION when AWS_DEFAULT_REGION is absent', () => {
    process.env.AWS_REGION = 'eu-west-1';
    expect(configuration().storage.s3.region).toBe('eu-west-1');
  });

  it('defaults region to auto', () => {
    expect(configuration().storage.s3.region).toBe('auto');
  });

  describe('forcePathStyle', () => {
    it('defaults to false (Railway Buckets need virtual-hosted style)', () => {
      expect(configuration().storage.s3.forcePathStyle).toBe('false');
    });

    it('stays false when Railway reports virtual URL style', () => {
      process.env.AWS_S3_URL_STYLE = 'virtual';
      process.env.S3_FORCE_PATH_STYLE = 'true';
      expect(configuration().storage.s3.forcePathStyle).toBe('false');
    });

    it('turns on when Railway reports path URL style', () => {
      process.env.AWS_S3_URL_STYLE = 'path';
      expect(configuration().storage.s3.forcePathStyle).toBe('true');
    });

    it('honours S3_FORCE_PATH_STYLE for MinIO-style endpoints', () => {
      process.env.S3_FORCE_PATH_STYLE = 'true';
      expect(configuration().storage.s3.forcePathStyle).toBe('true');
    });
  });
});
