import * as fs from 'fs/promises';
import * as path from 'path';
import type { ILogger } from '../../shared/logger/ILogger';
import type { IPlugin } from '../contracts/IPlugin';
import type { PluginManifest } from '../contracts/PluginManifest';
import { PluginManifestError } from '../core/errors/PluginError';
import { resolveLoadOrder } from './DependencyResolver';
import { validateManifest } from './ManifestValidator';

const MANIFEST_FILE = 'plugin.json';
const PLUGINS_DIR = 'plugins';

export class PluginLoader {
  constructor(
    private readonly baseDir: string,
    private readonly logger: ILogger,
  ) {}

  async loadManifestFromDirectory(dir: string): Promise<PluginManifest> {
    const manifestPath = path.join(dir, MANIFEST_FILE);

    let raw: string;
    try {
      raw = await fs.readFile(manifestPath, 'utf-8');
    } catch {
      throw new PluginManifestError(`No ${MANIFEST_FILE} found in '${dir}'`);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new PluginManifestError(`Invalid JSON in ${MANIFEST_FILE} at '${dir}'`);
    }

    return validateManifest(parsed);
  }

  async discoverManifests(): Promise<Array<{ manifest: PluginManifest; directory: string }>> {
    const pluginsRoot = path.join(this.baseDir, PLUGINS_DIR);
    const result: Array<{ manifest: PluginManifest; directory: string }> = [];

    let entries: string[];
    try {
      const dirents = await fs.readdir(pluginsRoot, { withFileTypes: true });
      entries = dirents.filter(d => d.isDirectory()).map(d => d.name);
    } catch {
      this.logger.debug({ pluginsRoot }, 'Plugin discovery directory not found or empty');
      return [];
    }

    for (const entry of entries) {
      const dir = path.join(pluginsRoot, entry);
      try {
        const manifest = await this.loadManifestFromDirectory(dir);
        result.push({ manifest, directory: dir });
        this.logger.debug({ pluginId: manifest.id, version: manifest.version }, 'Plugin discovered');
      } catch (error) {
        this.logger.warn({ dir, error }, 'Failed to load plugin manifest — skipping');
      }
    }

    return result;
  }

  resolveLoadOrder(manifests: PluginManifest[]): PluginManifest[] {
    return resolveLoadOrder(manifests);
  }

  validateManifest(raw: unknown): PluginManifest {
    return validateManifest(raw);
  }

  createPluginFromFactory(
    factory: (manifest: PluginManifest) => IPlugin,
    manifest: PluginManifest,
  ): IPlugin {
    const start = Date.now();
    const plugin = factory(manifest);
    this.logger.debug(
      { pluginId: manifest.id, loadTimeMs: Date.now() - start },
      'Plugin created from factory',
    );
    return plugin;
  }
}
