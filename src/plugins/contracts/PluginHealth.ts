export enum PluginHealthStatus {
  Healthy = 'healthy',
  Warning = 'warning',
  Degraded = 'degraded',
  Failed = 'failed',
  Disabled = 'disabled',
}

export interface PluginHealth {
  readonly pluginId: string;
  readonly status: PluginHealthStatus;
  readonly message: string | null;
  readonly checkedAt: Date;
}
