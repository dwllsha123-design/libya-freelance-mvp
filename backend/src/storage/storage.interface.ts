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
  deleteFile(url: string): Promise<void>;
}

export const STORAGE_SERVICE = Symbol('STORAGE_SERVICE');
