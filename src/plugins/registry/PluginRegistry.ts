import type { IPlugin } from '../contracts/IPlugin';
import type { PluginManifest } from '../contracts/PluginManifest';
import type { PluginMetadata } from '../contracts/PluginMetadata';
import { PluginStatus } from '../contracts/PluginStatus';
import {
  PluginAlreadyRegisteredError,
  PluginNotFoundError,
} from '../core/errors/PluginError';

interface MutableMetadata {
  manifest: PluginManifest;
  status: PluginStatus;
  installedAt: Date;
  loadedAt: Date | null;
  startedAt: Date | null;
  pluginDirectory: string;
  config: Record<string, unknown>;
}

export class PluginRegistry {
  private readonly entries = new Map<string, MutableMetadata>();
  private readonly plugins = new Map<string, IPlugin>();

  register(plugin: IPlugin, directory: string): PluginMetadata {
    const { id } = plugin.manifest;
    if (this.entries.has(id)) {
      throw new PluginAlreadyRegisteredError(id);
    }

    const metadata: MutableMetadata = {
      manifest: plugin.manifest,
      status: PluginStatus.Installed,
      installedAt: new Date(),
      loadedAt: null,
      startedAt: null,
      pluginDirectory: directory,
      config: {},
    };

    this.entries.set(id, metadata);
    this.plugins.set(id, plugin);
    return this.toReadonly(metadata);
  }

  unregister(pluginId: string): void {
    if (!this.entries.has(pluginId)) {
      throw new PluginNotFoundError(pluginId);
    }
    this.entries.delete(pluginId);
    this.plugins.delete(pluginId);
  }

  find(pluginId: string): PluginMetadata | undefined {
    const entry = this.entries.get(pluginId);
    return entry !== undefined ? this.toReadonly(entry) : undefined;
  }

  get(pluginId: string): PluginMetadata {
    const entry = this.entries.get(pluginId);
    if (entry === undefined) throw new PluginNotFoundError(pluginId);
    return this.toReadonly(entry);
  }

  getPlugin(pluginId: string): IPlugin {
    const plugin = this.plugins.get(pluginId);
    if (plugin === undefined) throw new PluginNotFoundError(pluginId);
    return plugin;
  }

  list(): ReadonlyArray<PluginMetadata> {
    return [...this.entries.values()].map(e => this.toReadonly(e));
  }

  search(query: string): ReadonlyArray<PluginMetadata> {
    const q = query.toLowerCase();
    return this.list().filter(
      m =>
        m.manifest.id.toLowerCase().includes(q) ||
        m.manifest.name.toLowerCase().includes(q) ||
        m.manifest.tags.some(t => t.toLowerCase().includes(q)),
    );
  }

  enable(pluginId: string): void {
    const entry = this.requireEntry(pluginId);
    if (entry.status === PluginStatus.Disabled) {
      entry.status = PluginStatus.Installed;
    }
  }

  disable(pluginId: string): void {
    const entry = this.requireEntry(pluginId);
    entry.status = PluginStatus.Disabled;
  }

  reload(pluginId: string): void {
    const entry = this.requireEntry(pluginId);
    entry.status = PluginStatus.Installed;
    entry.loadedAt = null;
    entry.startedAt = null;
    entry.config = {};
  }

  updateStatus(pluginId: string, status: PluginStatus): void {
    const entry = this.requireEntry(pluginId);
    entry.status = status;
    if (status === PluginStatus.Running) {
      entry.startedAt = new Date();
    }
    if (status === PluginStatus.Initialized) {
      entry.loadedAt = new Date();
    }
  }

  updateConfig(pluginId: string, config: Record<string, unknown>): void {
    this.requireEntry(pluginId).config = { ...config };
  }

  private requireEntry(pluginId: string): MutableMetadata {
    const entry = this.entries.get(pluginId);
    if (entry === undefined) throw new PluginNotFoundError(pluginId);
    return entry;
  }

  private toReadonly(entry: MutableMetadata): PluginMetadata {
    return {
      manifest: entry.manifest,
      status: entry.status,
      installedAt: entry.installedAt,
      loadedAt: entry.loadedAt,
      startedAt: entry.startedAt,
      pluginDirectory: entry.pluginDirectory,
      config: Object.freeze({ ...entry.config }),
    };
  }
}
