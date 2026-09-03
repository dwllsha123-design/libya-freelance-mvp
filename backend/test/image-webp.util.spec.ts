import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import {
  WEBP_CONTENT_TYPE,
  WEBP_EXTENSION,
  toPortfolioWebp,
  toProfileWebp,
} from '../src/storage/image-webp.util.js';

type Format = 'jpeg' | 'png' | 'webp';

function fixture(
  format: Format,
  width: number,
  height: number,
): Promise<Buffer> {
  const image = sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 200, g: 80, b: 40 },
    },
  });

  if (format === 'jpeg') return image.jpeg().toBuffer();
  if (format === 'png') return image.png().toBuffer();
  return image.webp().toBuffer();
}

/** WebP files are a RIFF container tagged `WEBP` at byte 8. */
function isWebpContainer(buffer: Buffer): boolean {
  return (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  );
}

describe('mandatory WebP storage policy', () => {
  it('declares webp as the stored format', () => {
    expect(WEBP_CONTENT_TYPE).toBe('image/webp');
    expect(WEBP_EXTENSION).toBe('.webp');
  });

  describe('profile photos', () => {
    it.each<Format>(['jpeg', 'png', 'webp'])(
      'converts %s input to a 512x512 webp',
      async (format) => {
        const output = await toProfileWebp(await fixture(format, 900, 700));
        const meta = await sharp(output).metadata();

        expect(meta.format).toBe('webp');
        expect(isWebpContainer(output)).toBe(true);
        expect(meta.width).toBe(512);
        expect(meta.height).toBe(512);
      },
    );

    it('crops to cover rather than distorting a non-square source', async () => {
      const output = await toProfileWebp(await fixture('jpeg', 1200, 400));
      const meta = await sharp(output).metadata();

      expect(meta.width).toBe(512);
      expect(meta.height).toBe(512);
    });
  });

  describe('portfolio images', () => {
    it.each<Format>(['jpeg', 'png', 'webp'])(
      'converts %s input to webp',
      async (format) => {
        const output = await toPortfolioWebp(await fixture(format, 800, 600));
        const meta = await sharp(output).metadata();

        expect(meta.format).toBe('webp');
        expect(isWebpContainer(output)).toBe(true);
      },
    );

    it('caps the long edge at 1600 while preserving aspect ratio', async () => {
      const output = await toPortfolioWebp(await fixture('png', 3200, 1600));
      const meta = await sharp(output).metadata();

      expect(meta.width).toBe(1600);
      expect(meta.height).toBe(800);
    });

    it('does not enlarge an image smaller than the bounding box', async () => {
      const output = await toPortfolioWebp(await fixture('jpeg', 640, 480));
      const meta = await sharp(output).metadata();

      expect(meta.width).toBe(640);
      expect(meta.height).toBe(480);
    });
  });

  describe('rejection', () => {
    it('rejects bytes that only claim to be an image', async () => {
      await expect(toProfileWebp(Buffer.from('not an image'))).rejects.toThrow(
        BadRequestException,
      );
      await expect(
        toPortfolioWebp(Buffer.from('not an image')),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects an empty buffer', async () => {
      await expect(toProfileWebp(Buffer.alloc(0))).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
