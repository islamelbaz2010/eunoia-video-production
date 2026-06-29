import { PluginRegistry } from '../../../src/plugins/registry/PluginRegistry';
import { PluginStatus } from '../../../src/plugins/contracts/PluginStatus';
import {
  PluginAlreadyRegisteredError,
  PluginNotFoundError,
} from '../../../src/plugins/core/errors/PluginError';
import { makeManifest, makePlugin } from '../helpers';

describe('PluginRegistry', () => {
  let registry: PluginRegistry;

  beforeEach(() => {
    registry = new PluginRegistry();
  });

  describe('register', () => {
    it('registers a plugin and returns metadata', () => {
      const plugin = makePlugin();
      const meta = registry.register(plugin, '/plugins/test');
      expect(meta.manifest.id).toBe('test-plugin');
      expect(meta.status).toBe(PluginStatus.Installed);
      expect(meta.pluginDirectory).toBe('/plugins/test');
    });

    it('throws PluginAlreadyRegisteredError on duplicate id', () => {
      registry.register(makePlugin(), '/plugins/test');
      expect(() => registry.register(makePlugin(), '/plugins/test')).toThrow(
        PluginAlreadyRegisteredError,
      );
    });

    it('sets installedAt', () => {
      const meta = registry.register(makePlugin(), '/plugins/test');
      expect(meta.installedAt).toBeInstanceOf(Date);
    });

    it('freezes config', () => {
      const meta = registry.register(makePlugin(), '/plugins/test');
      expect(Object.isFrozen(meta.config)).toBe(true);
    });
  });

  describe('unregister', () => {
    it('removes the plugin', () => {
      registry.register(makePlugin(), '/plugins/test');
      registry.unregister('test-plugin');
      expect(registry.find('test-plugin')).toBeUndefined();
    });

    it('throws PluginNotFoundError for unknown id', () => {
      expect(() => registry.unregister('missing')).toThrow(PluginNotFoundError);
    });
  });

  describe('find', () => {
    it('returns metadata when registered', () => {
      registry.register(makePlugin(), '/dir');
      expect(registry.find('test-plugin')).toBeDefined();
    });

    it('returns undefined for unknown id', () => {
      expect(registry.find('unknown')).toBeUndefined();
    });
  });

  describe('get', () => {
    it('returns metadata for registered plugin', () => {
      registry.register(makePlugin(), '/dir');
      expect(registry.get('test-plugin').manifest.id).toBe('test-plugin');
    });

    it('throws PluginNotFoundError for unknown id', () => {
      expect(() => registry.get('unknown')).toThrow(PluginNotFoundError);
    });
  });

  describe('getPlugin', () => {
    it('returns the IPlugin instance', () => {
      const plugin = makePlugin();
      registry.register(plugin, '/dir');
      expect(registry.getPlugin('test-plugin')).toBe(plugin);
    });

    it('throws PluginNotFoundError for unknown id', () => {
      expect(() => registry.getPlugin('unknown')).toThrow(PluginNotFoundError);
    });
  });

  describe('list', () => {
    it('returns all registered plugins', () => {
      registry.register(makePlugin(makeManifest({ id: 'a' })), '/a');
      registry.register(makePlugin(makeManifest({ id: 'b' })), '/b');
      expect(registry.list()).toHaveLength(2);
    });

    it('returns empty array when empty', () => {
      expect(registry.list()).toEqual([]);
    });
  });

  describe('search', () => {
    it('matches by id', () => {
      registry.register(makePlugin(makeManifest({ id: 'openai-plugin' })), '/dir');
      registry.register(makePlugin(makeManifest({ id: 'slack-plugin' })), '/dir2');
      expect(registry.search('openai')).toHaveLength(1);
    });

    it('matches by name', () => {
      registry.register(makePlugin(makeManifest({ id: 'p1', name: 'Analytics Dashboard' })), '/dir');
      expect(registry.search('analytics')).toHaveLength(1);
    });

    it('matches by tag', () => {
      registry.register(makePlugin(makeManifest({ id: 'p1', tags: ['video', 'ai'] })), '/dir');
      expect(registry.search('video')).toHaveLength(1);
    });

    it('returns empty when no match', () => {
      registry.register(makePlugin(), '/dir');
      expect(registry.search('zzz-nomatch')).toHaveLength(0);
    });
  });

  describe('enable / disable', () => {
    it('disable sets status to Disabled', () => {
      registry.register(makePlugin(), '/dir');
      registry.disable('test-plugin');
      expect(registry.get('test-plugin').status).toBe(PluginStatus.Disabled);
    });

    it('enable restores status to Installed from Disabled', () => {
      registry.register(makePlugin(), '/dir');
      registry.disable('test-plugin');
      registry.enable('test-plugin');
      expect(registry.get('test-plugin').status).toBe(PluginStatus.Installed);
    });

    it('throws PluginNotFoundError for unknown id', () => {
      expect(() => registry.disable('unknown')).toThrow(PluginNotFoundError);
    });
  });

  describe('reload', () => {
    it('resets status to Installed and clears config', () => {
      registry.register(makePlugin(), '/dir');
      registry.updateStatus('test-plugin', PluginStatus.Running);
      registry.updateConfig('test-plugin', { key: 'value' });
      registry.reload('test-plugin');

      const meta = registry.get('test-plugin');
      expect(meta.status).toBe(PluginStatus.Installed);
      expect(meta.config).toEqual({});
      expect(meta.loadedAt).toBeNull();
      expect(meta.startedAt).toBeNull();
    });
  });

  describe('updateStatus', () => {
    it('sets startedAt when status becomes Running', () => {
      registry.register(makePlugin(), '/dir');
      registry.updateStatus('test-plugin', PluginStatus.Running);
      expect(registry.get('test-plugin').startedAt).toBeInstanceOf(Date);
    });

    it('sets loadedAt when status becomes Initialized', () => {
      registry.register(makePlugin(), '/dir');
      registry.updateStatus('test-plugin', PluginStatus.Initialized);
      expect(registry.get('test-plugin').loadedAt).toBeInstanceOf(Date);
    });
  });

  describe('updateConfig', () => {
    it('updates the config', () => {
      registry.register(makePlugin(), '/dir');
      registry.updateConfig('test-plugin', { apiKey: 'abc' });
      expect(registry.get('test-plugin').config['apiKey']).toBe('abc');
    });

    it('throws PluginNotFoundError for unknown id', () => {
      expect(() => registry.updateConfig('unknown', {})).toThrow(PluginNotFoundError);
    });
  });
});
