import type { Readable } from 'node:stream';

export interface StorageObject {
  body: Readable;
  contentType?: string;
  contentLength?: number;
  etag?: string;
}

export interface StorageService {
  uploadProfileImage(
    userId: string,
    file: Express.Multer.File,
  ): Promise<string>;
  uploadPortfolioImage(
    userId: string,
    portfolioItemId: string,
    file: Express.Multer.File,
  ): Promise<string>;
  uploadChatFile(userId: string, file: Express.Multer.File): Promise<string>;
  deleteFile(url: string): Promise<void>;
  /**
   * Private object write (verification docs). Key must be path-safe.
   * Returns the storage key (never a public URL).
   */
  putPrivateObject(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<string>;
  deletePrivateObject?(key: string): Promise<void>;
  /**
   * Read an object back out of the store. Only implemented by drivers whose
   * bucket is private (Railway Buckets have no public object URLs), so the
   * API must stream the bytes itself. The local driver serves `/uploads`
   * statically and therefore leaves this undefined for public assets —
   * but implements it for private verification keys.
   */
  getObject?(key: string): Promise<StorageObject | null>;
}

export const STORAGE_SERVICE = Symbol('STORAGE_SERVICE');
