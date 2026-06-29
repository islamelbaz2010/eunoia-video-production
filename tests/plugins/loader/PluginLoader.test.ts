import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';
import { PluginLoader } from '../../../src/plugins/loader/PluginLoader';
import { PluginManifestError } from '../../../src/plugins/core/errors/PluginError';
import { PluginPermission } from '../../../src/plugins/contracts/PluginPermission';
import { makeLogger, makeManifest, makePlugin } from '../helpers';

const validManifestJson = {
  id: 'test-plugin',
  name: 'Test Plugin',
  version: '1.0.0',
  description: 'Test',
  author: 'Author',
  entryPoint: 'index.js',
  permissions: [PluginPermission.AI],
  capabilities: [],
  dependencies: [],
  configSchema: {},
  minEngineVersion: '1.0.0',
  tags: [],
};

async function makeTempDir(): Promise<string> {
  const dir = path.join(os.tmpdir(), `plugin-loader-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

describe('PluginLoader', () => {
  let baseDir: string;
  let loader: PluginLoader;

  beforeEach(async () => {
    baseDir = await makeTempDir();
    loader = new PluginLoader(baseDir, makeLogger());
  });

  afterEach(async () => {
    await fs.rm(baseDir, { recursive: true, force: true });
  });

  describe('loadManifestFromDirectory', () => {
    it('loads and validates a valid plugin.json', async () => {
      const pluginDir = path.join(baseDir, 'my-plugin');
      await fs.mkdir(pluginDir);
      await fs.writeFile(path.join(pluginDir, 'plugin.json'), JSON.stringify(validManifestJson));

      const manifest = await loader.loadManifestFromDirectory(pluginDir);
      expect(manifest.id).toBe('test-plugin');
    });

    it('throws PluginManifestError when plugin.json is missing', async () => {
      const dir = path.join(baseDir, 'empty');
      await fs.mkdir(dir);
      await expect(loader.loadManifestFromDirectory(dir)).rejects.toThrow(PluginManifestError);
    });

    it('throws PluginManifestError when plugin.json has invalid JSON', async () => {
      const dir = path.join(baseDir, 'bad-json');
      await fs.mkdir(dir);
      await fs.writeFile(path.join(dir, 'plugin.json'), '{ invalid json }');
      await expect(loader.loadManifestFromDirectory(dir)).rejects.toThrow(PluginManifestError);
    });

    it('throws PluginManifestError when manifest is invalid', async () => {
      const dir = path.join(baseDir, 'bad-manifest');
      await fs.mkdir(dir);
      await fs.writeFile(path.join(dir, 'plugin.json'), JSON.stringify({ id: '' }));
      await expect(loader.loadManifestFromDirectory(dir)).rejects.toThrow(PluginManifestError);
    });
  });

  describe('discoverManifests', () => {
    it('returns empty array when plugins directory does not exist', async () => {
      const result = await loader.discoverManifests();
      expect(result).toEqual([]);
    });

    it('discovers plugins from plugins/ subdirectory', async () => {
      const pluginsDir = path.join(baseDir, 'plugins', 'my-plugin');
      await fs.mkdir(pluginsDir, { recursive: true });
      await fs.writeFile(
        path.join(pluginsDir, 'plugin.json'),
        JSON.stringify(validManifestJson),
      );

      const result = await loader.discoverManifests();
      expect(result).toHaveLength(1);
      expect(result[0]!.manifest.id).toBe('test-plugin');
    });

    it('skips directories with invalid manifests', async () => {
      const pluginsRoot = path.join(baseDir, 'plugins');
      await fs.mkdir(path.join(pluginsRoot, 'bad'), { recursive: true });
      await fs.writeFile(path.join(pluginsRoot, 'bad', 'plugin.json'), '{}');

      const result = await loader.discoverManifests();
      expect(result).toHaveLength(0);
    });
  });

  describe('resolveLoadOrder', () => {
    it('delegates to resolveLoadOrder and returns sorted manifests', () => {
      const a = makeManifest({ id: 'a' });
      const b = makeManifest({
        id: 'b',
        dependencies: [{ pluginId: 'a', required: true, versionConstraint: '>=1.0.0' }],
      });
      const order = loader.resolveLoadOrder([b, a]);
      expect(order[0]!.id).toBe('a');
    });
  });

  describe('validateManifest', () => {
    it('validates and returns the manifest', () => {
      const result = loader.validateManifest(validManifestJson);
      expect(result.id).toBe('test-plugin');
    });

    it('throws on invalid manifest', () => {
      expect(() => loader.validateManifest({})).toThrow(PluginManifestError);
    });
  });

  describe('createPluginFromFactory', () => {
    it('calls factory and returns plugin', () => {
      const manifest = makeManifest();
      const plugin = makePlugin(manifest);
      const factory = jest.fn().mockReturnValue(plugin);

      const result = loader.createPluginFromFactory(factory, manifest);
      expect(factory).toHaveBeenCalledWith(manifest);
      expect(result).toBe(plugin);
    });
  });
});
