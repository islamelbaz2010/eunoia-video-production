import { PluginLifecycleManager } from '../../../src/plugins/lifecycle/PluginLifecycleManager';
import { PluginRegistry } from '../../../src/plugins/registry/PluginRegistry';
import { PluginMetrics } from '../../../src/plugins/observability/PluginMetrics';
import { PluginStatus } from '../../../src/plugins/contracts/PluginStatus';
import {
  PluginConfigurationError,
  PluginLifecycleError,
} from '../../../src/plugins/core/errors/PluginError';
import { PLUGIN_EVENT_TYPES } from '../../../src/plugins/events/PluginEvents';
import { makeEventBus, makeLogger, makeManifest, makePlugin, makeContext } from '../helpers';

function makeManager() {
  const registry = new PluginRegistry();
  const eventBus = makeEventBus();
  const metrics = new PluginMetrics();
  const logger = makeLogger();
  const mgr = new PluginLifecycleManager(registry, eventBus, metrics, logger);
  return { mgr, registry, eventBus, metrics, logger };
}

describe('PluginLifecycleManager', () => {
  describe('install', () => {
    it('registers plugin, calls install(), and publishes PluginInstalled event', async () => {
      const { mgr, registry, eventBus } = makeManager();
      const plugin = makePlugin();
      const ctx = makeContext();

      const meta = await mgr.install(plugin, ctx, '/dir/my-plugin');

      expect(meta.manifest.id).toBe('test-plugin');
      expect(registry.find('test-plugin')).toBeDefined();
      expect(plugin.install).toHaveBeenCalledWith(ctx);
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: PLUGIN_EVENT_TYPES.Installed }),
      );
    });

    it('records load metrics on install', async () => {
      const { mgr, metrics } = makeManager();
      const plugin = makePlugin();
      await mgr.install(plugin, makeContext(), '/dir');
      expect(metrics.getStats('test-plugin')).toBeDefined();
    });

    it('publishes PluginFailed event and rethrows on install failure', async () => {
      const { mgr, eventBus } = makeManager();
      const plugin = makePlugin();
      plugin.install.mockRejectedValueOnce(new Error('install failed'));

      await expect(mgr.install(plugin, makeContext(), '/dir')).rejects.toThrow('install failed');
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: PLUGIN_EVENT_TYPES.Failed }),
      );
    });
  });

  describe('configure', () => {
    it('applies defaults and updates config', async () => {
      const manifest = makeManifest({
        configSchema: {
          key: { type: 'string', required: true, description: 'API key' },
          timeout: { type: 'number', required: false, description: 'ms', default: 1000 },
        },
      });
      const plugin = makePlugin(manifest);
      const { mgr, registry } = makeManager();
      await mgr.install(plugin, makeContext('test-plugin'), '/dir');

      await mgr.configure('test-plugin', { key: 'abc' });

      expect(plugin.configure).toHaveBeenCalledWith({ key: 'abc', timeout: 1000 });
      expect(registry.get('test-plugin').status).toBe(PluginStatus.Configured);
    });

    it('throws PluginConfigurationError for invalid config', async () => {
      const manifest = makeManifest({
        configSchema: { key: { type: 'string', required: true, description: 'd' } },
      });
      const plugin = makePlugin(manifest);
      const { mgr } = makeManager();
      await mgr.install(plugin, makeContext('test-plugin'), '/dir');

      await expect(mgr.configure('test-plugin', {})).rejects.toThrow(PluginConfigurationError);
    });
  });

  describe('initialize', () => {
    it('calls plugin.initialize() and sets status Initialized', async () => {
      const { mgr, registry } = makeManager();
      const plugin = makePlugin();
      await mgr.install(plugin, makeContext(), '/dir');

      await mgr.initialize('test-plugin');

      expect(plugin.initialize).toHaveBeenCalled();
      expect(registry.get('test-plugin').status).toBe(PluginStatus.Initialized);
    });

    it('throws PluginLifecycleError when initialize fails', async () => {
      const { mgr } = makeManager();
      const plugin = makePlugin();
      plugin.initialize.mockRejectedValueOnce(new Error('init error'));
      await mgr.install(plugin, makeContext(), '/dir');

      await expect(mgr.initialize('test-plugin')).rejects.toThrow(PluginLifecycleError);
    });
  });

  describe('start', () => {
    it('calls plugin.start() and publishes PluginStarted event', async () => {
      const { mgr, eventBus } = makeManager();
      const plugin = makePlugin();
      await mgr.install(plugin, makeContext(), '/dir');

      await mgr.start('test-plugin');

      expect(plugin.start).toHaveBeenCalled();
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: PLUGIN_EVENT_TYPES.Started }),
      );
    });

    it('throws PluginLifecycleError and records failure when start fails', async () => {
      const { mgr, metrics } = makeManager();
      const plugin = makePlugin();
      plugin.start.mockRejectedValueOnce(new Error('start fail'));
      await mgr.install(plugin, makeContext(), '/dir');

      await expect(mgr.start('test-plugin')).rejects.toThrow(PluginLifecycleError);
      expect(metrics.getStats('test-plugin').failures).toBeGreaterThan(0);
    });
  });

  describe('pause / resume', () => {
    it('pause calls plugin.pause() and sets status Paused', async () => {
      const { mgr, registry } = makeManager();
      const plugin = makePlugin();
      await mgr.install(plugin, makeContext(), '/dir');
      await mgr.start('test-plugin');

      await mgr.pause('test-plugin');

      expect(plugin.pause).toHaveBeenCalled();
      expect(registry.get('test-plugin').status).toBe(PluginStatus.Paused);
    });

    it('resume calls plugin.resume() and sets status Running', async () => {
      const { mgr, registry, metrics } = makeManager();
      const plugin = makePlugin();
      await mgr.install(plugin, makeContext(), '/dir');
      await mgr.pause('test-plugin');

      await mgr.resume('test-plugin');

      expect(plugin.resume).toHaveBeenCalled();
      expect(registry.get('test-plugin').status).toBe(PluginStatus.Running);
      expect(metrics.getStats('test-plugin').restarts).toBe(1);
    });
  });

  describe('stop', () => {
    it('calls plugin.stop() and publishes PluginStopped event', async () => {
      const { mgr, eventBus } = makeManager();
      const plugin = makePlugin();
      await mgr.install(plugin, makeContext(), '/dir');
      await mgr.start('test-plugin');

      await mgr.stop('test-plugin');

      expect(plugin.stop).toHaveBeenCalled();
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: PLUGIN_EVENT_TYPES.Stopped }),
      );
    });
  });

  describe('shutdown', () => {
    it('calls plugin.shutdown() and sets status Stopped', async () => {
      const { mgr, registry } = makeManager();
      const plugin = makePlugin();
      await mgr.install(plugin, makeContext(), '/dir');

      await mgr.shutdown('test-plugin');

      expect(plugin.shutdown).toHaveBeenCalled();
      expect(registry.get('test-plugin').status).toBe(PluginStatus.Stopped);
    });
  });

  describe('uninstall', () => {
    it('calls plugin.uninstall(), publishes PluginRemoved, and removes from registry', async () => {
      const { mgr, registry, eventBus } = makeManager();
      const plugin = makePlugin();
      await mgr.install(plugin, makeContext(), '/dir');

      await mgr.uninstall('test-plugin');

      expect(plugin.uninstall).toHaveBeenCalled();
      expect(registry.find('test-plugin')).toBeUndefined();
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: PLUGIN_EVENT_TYPES.Removed }),
      );
    });

    it('throws PluginLifecycleError on failure', async () => {
      const { mgr } = makeManager();
      const plugin = makePlugin();
      plugin.uninstall.mockRejectedValueOnce(new Error('uninstall fail'));
      await mgr.install(plugin, makeContext(), '/dir');

      await expect(mgr.uninstall('test-plugin')).rejects.toThrow(PluginLifecycleError);
    });
  });

  describe('health', () => {
    it('returns health from plugin.health()', async () => {
      const { mgr } = makeManager();
      const plugin = makePlugin();
      await mgr.install(plugin, makeContext(), '/dir');

      const h = await mgr.health('test-plugin');
      expect(h.pluginId).toBe('test-plugin');
    });
  });

  describe('startAll / stopAll', () => {
    it('startAll starts all Initialized plugins', async () => {
      const { mgr } = makeManager();
      const p1 = makePlugin(makeManifest({ id: 'p1' }));
      const p2 = makePlugin(makeManifest({ id: 'p2' }));

      await mgr.install(p1, makeContext('p1'), '/dir1');
      await mgr.install(p2, makeContext('p2'), '/dir2');
      await mgr.initialize('p1');
      await mgr.initialize('p2');

      await mgr.startAll();

      expect(p1.start).toHaveBeenCalled();
      expect(p2.start).toHaveBeenCalled();
    });

    it('stopAll stops all Running plugins', async () => {
      const { mgr } = makeManager();
      const p1 = makePlugin(makeManifest({ id: 'p1' }));
      await mgr.install(p1, makeContext('p1'), '/dir1');
      await mgr.start('p1');

      await mgr.stopAll();

      expect(p1.stop).toHaveBeenCalled();
    });

    it('startAll skips plugins that fail to start without throwing', async () => {
      const { mgr } = makeManager();
      const p1 = makePlugin(makeManifest({ id: 'p1' }));
      const p2 = makePlugin(makeManifest({ id: 'p2' }));
      p1.start.mockRejectedValueOnce(new Error('fail'));

      await mgr.install(p1, makeContext('p1'), '/dir1');
      await mgr.install(p2, makeContext('p2'), '/dir2');
      await mgr.initialize('p1');
      await mgr.initialize('p2');

      await expect(mgr.startAll()).resolves.not.toThrow();
      expect(p2.start).toHaveBeenCalled();
    });
  });
});
