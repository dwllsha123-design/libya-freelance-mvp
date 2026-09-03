import {
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../common/decorators/public.decorator.js';
import { STORAGE_SERVICE, type StorageService } from './storage.interface.js';

/**
 * Read-through proxy for private object storage.
 *
 * Railway Buckets are private and expose no public object URLs, so profile and
 * portfolio images cannot be linked directly. Setting `S3_PUBLIC_BASE_URL` to
 * `https://<api-domain>/api/media` makes `publicUrlForKey()` mint URLs that
 * resolve here, which keeps stored URLs stable and permanent (unlike presigned
 * links) and needs no change to upload, delete, or any read path.
 *
 * Routes mirror the two key builders in `storage-upload.util.ts` at fixed
 * depth, so only the `profile-images/` and `portfolio/` prefixes are reachable
 * — arbitrary keys in the bucket cannot be read through this endpoint.
 */

const SAFE_SEGMENT = /^[A-Za-z0-9._-]+$/;
const IMMUTABLE_CACHE = 'public, max-age=31536000, immutable';

@Controller('media')
export class MediaController {
  constructor(
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  @Public()
  @Get('profile-images/:userId/:filename')
  profileImage(
    @Param('userId') userId: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    return this.streamObject(['profile-images', userId, filename], res);
  }

  @Public()
  @Get('portfolio/:userId/:itemId/:filename')
  portfolioImage(
    @Param('userId') userId: string,
    @Param('itemId') itemId: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    return this.streamObject(['portfolio', userId, itemId, filename], res);
  }

  private async streamObject(segments: string[], res: Response) {
    // Local driver serves /uploads statically and implements no reader.
    if (!this.storage.getObject) {
      throw new NotFoundException();
    }

    if (!segments.every((segment) => SAFE_SEGMENT.test(segment))) {
      throw new NotFoundException();
    }

    const object = await this.storage.getObject(segments.join('/'));
    if (!object) {
      throw new NotFoundException();
    }

    res.setHeader(
      'Content-Type',
      object.contentType ?? 'application/octet-stream',
    );
    res.setHeader('Cache-Control', IMMUTABLE_CACHE);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (object.contentLength !== undefined) {
      res.setHeader('Content-Length', String(object.contentLength));
    }
    if (object.etag) {
      res.setHeader('ETag', object.etag);
    }

    object.body.on('error', () => {
      res.destroy();
    });
    object.body.pipe(res);
  }
}
