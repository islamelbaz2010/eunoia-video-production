import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import { LocalStorageProvider } from '../../../src/core/storage/LocalStorageProvider';
import { AppError } from '../../../src/shared/errors/AppError';

async function makeProvider(): Promise<{ provider: LocalStorageProvider; baseDir: string }> {
  const baseDir = path.join(os.tmpdir(), `eunoia-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await fs.mkdir(baseDir, { recursive: true });
  return { provider: new LocalStorageProvider(baseDir), baseDir };
}

async function cleanup(baseDir: string): Promise<void> {
  await fs.rm(baseDir, { recursive: true, force: true });
}

describe('LocalStorageProvider', () => {
  it('has name "local"', async () => {
    const { provider, baseDir } = await makeProvider();
    expect(provider.name).toBe('local');
    await cleanup(baseDir);
  });

  describe('upload', () => {
    it('creates the file and returns StorageObject', async () => {
      const { provider, baseDir } = await makeProvider();
      const data = Buffer.from('hello world');
      const obj = await provider.upload('test.txt', data, 'text/plain');

      expect(obj.key).toBe('test.txt');
      expect(obj.size).toBe(data.length);
      expect(obj.contentType).toBe('text/plain');
      await cleanup(baseDir);
    });

    it('creates nested directories for keys with slashes', async () => {
      const { provider, baseDir } = await makeProvider();
      const data = Buffer.from('nested');
      await provider.upload('a/b/c.txt', data, 'text/plain');

      const filePath = path.join(baseDir, 'a', 'b', 'c.txt');
      await expect(fs.stat(filePath)).resolves.toBeDefined();
      await cleanup(baseDir);
    });
  });

  describe('download', () => {
    it('reads uploaded file content', async () => {
      const { provider, baseDir } = await makeProvider();
      const data = Buffer.from('content data');
      await provider.upload('file.bin', data, 'application/octet-stream');

      const downloaded = await provider.download('file.bin');
      expect(downloaded).toEqual(data);
      await cleanup(baseDir);
    });

    it('throws AppError when file does not exist', async () => {
      const { provider, baseDir } = await makeProvider();
      await expect(provider.download('missing.txt')).rejects.toThrow(AppError);
      await cleanup(baseDir);
    });
  });

  describe('exists', () => {
    it('returns true for an uploaded file', async () => {
      const { provider, baseDir } = await makeProvider();
      await provider.upload('exists.txt', Buffer.from('x'), 'text/plain');
      expect(await provider.exists('exists.txt')).toBe(true);
      await cleanup(baseDir);
    });

    it('returns false for a missing file', async () => {
      const { provider, baseDir } = await makeProvider();
      expect(await provider.exists('no-file.txt')).toBe(false);
      await cleanup(baseDir);
    });
  });

  describe('delete', () => {
    it('removes an uploaded file', async () => {
      const { provider, baseDir } = await makeProvider();
      await provider.upload('del.txt', Buffer.from('bye'), 'text/plain');
      await provider.delete('del.txt');
      expect(await provider.exists('del.txt')).toBe(false);
      await cleanup(baseDir);
    });

    it('throws AppError when file does not exist', async () => {
      const { provider, baseDir } = await makeProvider();
      await expect(provider.delete('ghost.txt')).rejects.toThrow(AppError);
      await cleanup(baseDir);
    });
  });

  describe('list', () => {
    it('returns all uploaded files', async () => {
      const { provider, baseDir } = await makeProvider();
      await provider.upload('a.txt', Buffer.from('a'), 'text/plain');
      await provider.upload('b.txt', Buffer.from('b'), 'text/plain');

      const objects = await provider.list();
      const keys = objects.map(o => o.key).sort();
      expect(keys).toEqual(['a.txt', 'b.txt']);
      await cleanup(baseDir);
    });

    it('returns empty array for empty store', async () => {
      const { provider, baseDir } = await makeProvider();
      const objects = await provider.list();
      expect(objects).toEqual([]);
      await cleanup(baseDir);
    });

    it('filters by prefix', async () => {
      const { provider, baseDir } = await makeProvider();
      await provider.upload('img/photo.jpg', Buffer.from('img'), 'image/jpeg');
      await provider.upload('docs/readme.md', Buffer.from('doc'), 'text/markdown');

      const objects = await provider.list('img');
      expect(objects).toHaveLength(1);
      await cleanup(baseDir);
    });
  });
});
