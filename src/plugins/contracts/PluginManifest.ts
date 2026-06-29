import type { ConfigField } from './ConfigField';
import type { PluginCapability } from './PluginCapability';
import type { PluginDependency } from './PluginDependency';
import type { PluginPermission } from './PluginPermission';

export interface PluginManifest {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly author: string;
  readonly entryPoint: string;
  readonly permissions: ReadonlyArray<PluginPermission>;
  readonly capabilities: ReadonlyArray<PluginCapability>;
  readonly dependencies: ReadonlyArray<PluginDependency>;
  readonly configSchema: Readonly<Record<string, ConfigField>>;
  readonly minEngineVersion: string;
  readonly tags: ReadonlyArray<string>;
}
