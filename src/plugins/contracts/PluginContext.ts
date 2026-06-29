import type { IEventBus } from '../../core/events/IEventBus';
import type { ILogger } from '../../shared/logger/ILogger';
import type { PluginPermission } from './PluginPermission';

export interface PluginContext {
  readonly pluginId: string;
  readonly logger: ILogger;
  readonly eventBus: IEventBus;
  readonly config: Readonly<Record<string, unknown>>;
  readonly permissions: ReadonlyArray<PluginPermission>;
}
