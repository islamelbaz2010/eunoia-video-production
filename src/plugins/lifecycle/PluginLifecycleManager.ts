import type { IEventBus } from '../../core/events/IEventBus';
import type { ILogger } from '../../shared/logger/ILogger';
import type { IPlugin } from '../contracts/IPlugin';
import type { PluginContext } from '../contracts/PluginContext';
import type { PluginHealth } from '../contracts/PluginHealth';
import type { PluginMetadata } from '../contracts/PluginMetadata';
import { PluginStatus } from '../contracts/PluginStatus';
import { PluginLifecycleError, PluginNotFoundError } from '../core/errors/PluginError';
import {
  createPluginFailedEvent,
  createPluginInstalledEvent,
  createPluginRemovedEvent,
  createPluginStartedEvent,
  createPluginStoppedEvent,
} from '../events/PluginEvents';
import { PluginConfigValidator } from '../loader/PluginConfigValidator';
import { PluginMetrics } from '../observability/PluginMetrics';
import type { PluginRegistry } from '../registry/PluginRegistry';
import { PluginConfigurationError } from '../core/errors/PluginError';

export class PluginLifecycleManager {
  private readonly configValidator = new PluginConfigValidator();

  constructor(
    private readonly registry: PluginRegistry,
    private readonly eventBus: IEventBus,
    private readonly metrics: PluginMetrics,
    private readonly logger: ILogger,
  ) {}

  async install(
    plugin: IPlugin,
    context: PluginContext,
    directory: string,
  ): Promise<PluginMetadata> {
    const { id, version } = plugin.manifest;
    const start = Date.now();

    try {
      const metadata = this.registry.register(plugin, directory);
      await plugin.install(context);
      this.metrics.recordLoad(id, Date.now() - start);
      await this.eventBus.publish(createPluginInstalledEvent(id, { pluginId: id, version, directory }));
      this.logger.info({ pluginId: id, version }, 'Plugin installed');
      return metadata;
    } catch (error) {
      this.metrics.recordFailure(id);
      await this.eventBus.publish(
        createPluginFailedEvent(id, { pluginId: id, version, error: String(error), operation: 'install' }),
      );
      throw error;
    }
  }

  async configure(pluginId: string, config: Record<string, unknown>): Promise<void> {
    const metadata = this.registry.get(pluginId);
    const plugin = this.registry.getPlugin(pluginId);
    const withDefaults = this.configValidator.applyDefaults(
      metadata.manifest.configSchema,
      config,
    );
    const errors = this.configValidator.validate(metadata.manifest.configSchema, withDefaults);

    if (errors.length > 0) {
      throw new PluginConfigurationError(pluginId, errors);
    }

    await plugin.configure(withDefaults);
    this.registry.updateConfig(pluginId, withDefaults);
    this.registry.updateStatus(pluginId, PluginStatus.Configured);
    this.logger.info({ pluginId }, 'Plugin configured');
  }

  async initialize(pluginId: string): Promise<void> {
    await this.runStep(pluginId, 'initialize', PluginStatus.Initialized, async plugin => {
      await plugin.initialize();
    });
  }

  async start(pluginId: string): Promise<void> {
    await this.runStep(pluginId, 'start', PluginStatus.Running, async plugin => {
      await plugin.start();
      await this.eventBus.publish(
        createPluginStartedEvent(pluginId, {
          pluginId,
          version: plugin.manifest.version,
        }),
      );
    });
  }

  async pause(pluginId: string): Promise<void> {
    await this.runStep(pluginId, 'pause', PluginStatus.Paused, async plugin => {
      await plugin.pause();
    });
  }

  async resume(pluginId: string): Promise<void> {
    await this.runStep(pluginId, 'resume', PluginStatus.Running, async plugin => {
      await plugin.resume();
      this.metrics.recordRestart(pluginId);
    });
  }

  async stop(pluginId: string): Promise<void> {
    await this.runStep(pluginId, 'stop', PluginStatus.Stopped, async plugin => {
      await plugin.stop();
      await this.eventBus.publish(
        createPluginStoppedEvent(pluginId, {
          pluginId,
          version: plugin.manifest.version,
        }),
      );
    });
  }

  async shutdown(pluginId: string): Promise<void> {
    await this.runStep(pluginId, 'shutdown', PluginStatus.Stopped, async plugin => {
      await plugin.shutdown();
    });
  }

  async uninstall(pluginId: string): Promise<void> {
    const plugin = this.registry.getPlugin(pluginId);

    try {
      await plugin.uninstall();
      await this.eventBus.publish(
        createPluginRemovedEvent(pluginId, {
          pluginId,
          version: plugin.manifest.version,
        }),
      );
      this.registry.unregister(pluginId);
      this.logger.info({ pluginId }, 'Plugin uninstalled');
    } catch (error) {
      this.metrics.recordFailure(pluginId);
      this.registry.updateStatus(pluginId, PluginStatus.Failed);
      throw new PluginLifecycleError(pluginId, 'uninstall', String(error));
    }
  }

  async health(pluginId: string): Promise<PluginHealth> {
    const plugin = this.registry.getPlugin(pluginId);
    return plugin.health();
  }

  async startAll(): Promise<void> {
    const allPlugins = this.registry.list().filter(
      m => m.status === PluginStatus.Initialized || m.status === PluginStatus.Configured,
    );
    for (const meta of allPlugins) {
      try {
        await this.start(meta.manifest.id);
      } catch (error) {
        this.logger.error({ pluginId: meta.manifest.id, error }, 'Failed to start plugin');
      }
    }
  }

  async stopAll(): Promise<void> {
    const running = this.registry.list().filter(m => m.status === PluginStatus.Running);
    for (const meta of running) {
      try {
        await this.stop(meta.manifest.id);
      } catch (error) {
        this.logger.error({ pluginId: meta.manifest.id, error }, 'Failed to stop plugin');
      }
    }
  }

  private async runStep(
    pluginId: string,
    operation: string,
    nextStatus: PluginStatus,
    fn: (plugin: IPlugin) => Promise<void>,
  ): Promise<void> {
    let plugin: IPlugin;
    try {
      plugin = this.registry.getPlugin(pluginId);
    } catch {
      throw new PluginNotFoundError(pluginId);
    }

    try {
      await fn(plugin);
      this.registry.updateStatus(pluginId, nextStatus);
      this.logger.debug({ pluginId, operation }, 'Plugin lifecycle step completed');
    } catch (error) {
      this.metrics.recordFailure(pluginId);
      this.registry.updateStatus(pluginId, PluginStatus.Failed);
      await this.eventBus.publish(
        createPluginFailedEvent(pluginId, {
          pluginId,
          version: plugin.manifest.version,
          error: String(error),
          operation,
        }),
      );
      throw new PluginLifecycleError(pluginId, operation, String(error));
    }
  }
}
