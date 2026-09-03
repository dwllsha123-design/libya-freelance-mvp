import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import type { Sharp } from 'sharp';

/**
 * Every image accepted from a user is re-encoded to WebP before it reaches the
 * object store. JPEG/PNG/WebP go in, only WebP comes out, and the original
 * bytes are never persisted — callers upload the returned buffer, not
 * `file.buffer`.
 */
export const WEBP_CONTENT_TYPE = 'image/webp';
export const WEBP_EXTENSION = '.webp';

/** Profile photos are square avatars. */
const PROFILE_EDGE = 512;
const PROFILE_QUALITY = 78;

/** Portfolio images keep their shape inside a bounding box. */
const PORTFOLIO_MAX_EDGE = 1600;
const PORTFOLIO_QUALITY = 80;

const WEBP_EFFORT = 4;

/**
 * The multer byte limits bound the *encoded* upload, not the decoded bitmap, so
 * without a pixel ceiling a small highly-compressed file could expand into a
 * decompression bomb.
 */
const MAX_INPUT_PIXELS = 50_000_000;

/** 512x512, cropped to fill the frame. */
export function toProfileWebp(input: Buffer): Promise<Buffer> {
  return transcodeToWebp(input, (pipeline) =>
    pipeline
      .resize(PROFILE_EDGE, PROFILE_EDGE, { fit: 'cover' })
      .webp({ quality: PROFILE_QUALITY, effort: WEBP_EFFORT }),
  );
}

/** Max 1600x1600, aspect ratio preserved, smaller images left untouched. */
export function toPortfolioWebp(input: Buffer): Promise<Buffer> {
  return transcodeToWebp(input, (pipeline) =>
    pipeline
      .resize(PORTFOLIO_MAX_EDGE, PORTFOLIO_MAX_EDGE, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: PORTFOLIO_QUALITY, effort: WEBP_EFFORT }),
  );
}

async function transcodeToWebp(
  input: Buffer,
  apply: (pipeline: Sharp) => Sharp,
): Promise<Buffer> {
  try {
    // `.rotate()` without an angle applies the EXIF orientation, which has to
    // happen before the resize or portrait phone photos get cropped sideways.
    const pipeline = sharp(input, {
      limitInputPixels: MAX_INPUT_PIXELS,
      failOn: 'error',
    }).rotate();

    return await apply(pipeline).toBuffer();
  } catch (error) {
    // Reaching here means the bytes were not a decodable image, whatever the
    // declared MIME type claimed.
    throw new BadRequestException('تعذر معالجة الصورة', { cause: error });
  }
}
