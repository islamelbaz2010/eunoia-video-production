import * as fs from 'fs/promises';
import * as path from 'path';
import { AppError } from '../../shared/errors/AppError';
import type { IStorageProvider, StorageObject } from './IStorageProvider';

export class LocalStorageProvider implements IStorageProvider {
  readonly name = 'local';

  constructor(private readonly baseDir: string) {}

  async upload(key: string, data: Buffer, contentType: string): Promise<StorageObject> {
    const filePath = this.resolvePath(key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, data);
    const stat = await fs.stat(filePath);
    return { key, size: stat.size, lastModified: stat.mtime, contentType };
  }

  async download(key: string): Promise<Buffer> {
    const filePath = this.resolvePath(key);
    try {
      return await fs.readFile(filePath);
    } catch {
      throw new AppError(`File not found: ${key}`, 'NOT_FOUND');
    }
  }

  async delete(key: string): Promise<void> {
    const filePath = this.resolvePath(key);
    try {
      await fs.rm(filePath);
    } catch {
      throw new AppError(`File not found: ${key}`, 'NOT_FOUND');
    }
  }

  async exists(key: string): Promise<boolean> {
    const filePath = this.resolvePath(key);
    try {
      await fs.stat(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async list(prefix?: string): Promise<StorageObject[]> {
    const searchDir =
      prefix !== undefined && prefix.length > 0
        ? path.join(this.baseDir, prefix)
        : this.baseDir;

    try {
      return await this.listRecursive(searchDir, prefix ?? '');
    } catch {
      return [];
    }
  }

  private async listRecursive(dir: string, prefix: string): Promise<StorageObject[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const results: StorageObject[] = [];

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relKey = path.join(prefix, entry.name);

      if (entry.isDirectory()) {
        const nested = await this.listRecursive(fullPath, relKey);
        results.push(...nested);
      } else {
        const stat = await fs.stat(fullPath);
        results.push({
          key: relKey,
          size: stat.size,
          lastModified: stat.mtime,
          contentType: 'application/octet-stream',
        });
      }
    }

    return results;
  }

  private resolvePath(key: string): string {
    return path.join(this.baseDir, key);
  }
}
