import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import {
  resolveS3StorageConfig,
  S3StorageService,
} from '../src/storage/s3-storage.service.js';

const { sendMock } = vi.hoisted(() => ({
  sendMock: vi.fn(),
}));

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: class MockS3Client {
    send = sendMock;
  },
  PutObjectCommand: class PutObjectCommand {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  },
  DeleteObjectCommand: class DeleteObjectCommand {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  },
}));

function config(overrides: Record<string, string | undefined> = {}) {
  const values: Record<string, string | undefined> = {
    'storage.s3.bucket': 'libya-staging',
    'storage.s3.accessKeyId': 'test-key',
    'storage.s3.secretAccessKey': 'test-secret',
    'storage.s3.publicBaseUrl': 'https://cdn.example.com',
    'storage.s3.region': 'auto',
    'storage.s3.endpoint': 'https://s3.example.com',
    'storage.s3.forcePathStyle': 'true',
    ...overrides,
  };

  return {
    get: (key: string) => values[key],
  } as unknown as ConfigService;
}

/** A real, decodable image — uploads now run through the WebP transcoder. */
function pngFixture(width = 64, height = 64): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 10, g: 120, b: 200 },
    },
  })
    .png()
    .toBuffer();
}

describe('S3StorageService', () => {
  beforeEach(() => {
    sendMock.mockReset();
    sendMock.mockResolvedValue({});
  });

  it('fails fast when required S3 config is missing', () => {
    expect(() => resolveS3StorageConfig(config({ 'storage.s3.bucket': '' }))).toThrow(
      /S3_BUCKET/,
    );
  });

  it('stores a PNG profile upload as WebP under a safe bucket key', async () => {
    const service = new S3StorageService(config());
    const url = await service.uploadProfileImage('user-1', {
      mimetype: 'image/png',
      size: 128,
      buffer: await pngFixture(),
      originalname: 'evil/../../secret.png',
    } as Express.Multer.File);

    expect(sendMock).toHaveBeenCalledOnce();
    const command = sendMock.mock.calls[0]![0];
    expect(command.input.Bucket).toBe('libya-staging');
    expect(command.input.Key).toMatch(
      /^profile-images\/user-1\/[0-9a-f-]+\.webp$/,
    );
    expect(command.input.ContentType).toBe('image/webp');
    expect(url).toMatch(
      /^https:\/\/cdn\.example\.com\/profile-images\/user-1\/[0-9a-f-]+\.webp$/,
    );

    // The uploaded bytes are the transcoded image, never the original PNG.
    const stored = await sharp(command.input.Body as Buffer).metadata();
    expect(stored.format).toBe('webp');
  });

  it('stores a JPEG portfolio upload as WebP with ownership segments', async () => {
    const service = new S3StorageService(config());
    const original = await sharp({
      create: {
        width: 80,
        height: 40,
        channels: 3,
        background: { r: 0, g: 0, b: 0 },
      },
    })
      .jpeg()
      .toBuffer();

    await service.uploadPortfolioImage('user-1', 'item-9', {
      mimetype: 'image/jpeg',
      size: original.byteLength,
      buffer: original,
      originalname: 'photo.jpg',
    } as Express.Multer.File);

    const command = sendMock.mock.calls[0]![0];
    expect(command.input.Key).toMatch(
      /^portfolio\/user-1\/item-9\/[0-9a-f-]+\.webp$/,
    );
    expect(command.input.ContentType).toBe('image/webp');

    const stored = await sharp(command.input.Body as Buffer).metadata();
    expect(stored.format).toBe('webp');
  });

  it('rejects bytes that are not a decodable image', async () => {
    const service = new S3StorageService(config());

    await expect(
      service.uploadProfileImage('user-1', {
        mimetype: 'image/png',
        size: 3,
        buffer: Buffer.from('png'),
        originalname: 'fake.png',
      } as Express.Multer.File),
    ).rejects.toThrow();

    expect(sendMock).not.toHaveBeenCalled();
  });

  it('deletes by object key derived from public URL', async () => {
    const service = new S3StorageService(config());
    await service.deleteFile(
      'https://cdn.example.com/portfolio/user-1/item-9/file.jpg',
    );

    const command = sendMock.mock.calls[0]![0];
    expect(command.input.Key).toBe('portfolio/user-1/item-9/file.jpg');
  });

  it('generates public URLs without credentials', () => {
    const service = new S3StorageService(config());
    expect(service.publicUrlForKey('profile-images/u1/x.png')).toBe(
      'https://cdn.example.com/profile-images/u1/x.png',
    );
    expect(service.publicUrlForKey('profile-images/u1/x.png')).not.toContain('secret');
  });
});
