import type { PluginManifest } from './PluginManifest';
import type { PluginStatus } from './PluginStatus';

export interface PluginMetadata {
  readonly manifest: PluginManifest;
  readonly status: PluginStatus;
  readonly installedAt: Date;
  readonly loadedAt: Date | null;
  readonly startedAt: Date | null;
  readonly pluginDirectory: string;
  readonly config: Readonly<Record<string, unknown>>;
}
