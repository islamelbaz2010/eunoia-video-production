import { AppError } from '../../shared/errors/AppError';
import type { ILogger } from '../../shared/logger/ILogger';
import type { IStorageProvider, StorageObject } from './IStorageProvider';

export class GoogleDriveProvider implements IStorageProvider {
  readonly name = 'google-drive';

  constructor(
    private readonly folderId: string,
    private readonly logger: ILogger,
  ) {
    this.logger.debug({ folderId }, 'GoogleDriveProvider initialized');
  }

  async upload(_key: string, _data: Buffer, _contentType: string): Promise<StorageObject> {
    throw new AppError('GoogleDriveProvider is not yet implemented', 'NOT_IMPLEMENTED');
  }

  async download(_key: string): Promise<Buffer> {
    throw new AppError('GoogleDriveProvider is not yet implemented', 'NOT_IMPLEMENTED');
  }

  async delete(_key: string): Promise<void> {
    throw new AppError('GoogleDriveProvider is not yet implemented', 'NOT_IMPLEMENTED');
  }

  async exists(_key: string): Promise<boolean> {
    throw new AppError('GoogleDriveProvider is not yet implemented', 'NOT_IMPLEMENTED');
  }

  async list(_prefix?: string): Promise<StorageObject[]> {
    throw new AppError('GoogleDriveProvider is not yet implemented', 'NOT_IMPLEMENTED');
  }
}
