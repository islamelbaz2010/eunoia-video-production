import type { PluginHealth } from './PluginHealth';
import type { PluginManifest } from './PluginManifest';
import type { PluginContext } from './PluginContext';

export interface IPlugin {
  readonly manifest: PluginManifest;
  install(context: PluginContext): Promise<void>;
  configure(config: Record<string, unknown>): Promise<void>;
  initialize(): Promise<void>;
  start(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<void>;
  shutdown(): Promise<void>;
  health(): Promise<PluginHealth>;
  uninstall(): Promise<void>;
}
