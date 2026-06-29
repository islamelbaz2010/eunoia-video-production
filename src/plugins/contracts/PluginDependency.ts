export interface PluginDependency {
  readonly pluginId: string;
  readonly versionConstraint: string;
  readonly required: boolean;
}
