import {
  PLUGIN_EVENT_TYPES,
  createPluginFailedEvent,
  createPluginInstalledEvent,
  createPluginRemovedEvent,
  createPluginStartedEvent,
  createPluginStoppedEvent,
  createPluginUpdatedEvent,
} from '../../../src/plugins/events/PluginEvents';

describe('PluginEvents', () => {
  describe('PLUGIN_EVENT_TYPES', () => {
    it('defines all required event type keys', () => {
      expect(PLUGIN_EVENT_TYPES.Installed).toBe('plugin.installed');
      expect(PLUGIN_EVENT_TYPES.Started).toBe('plugin.started');
      expect(PLUGIN_EVENT_TYPES.Stopped).toBe('plugin.stopped');
      expect(PLUGIN_EVENT_TYPES.Failed).toBe('plugin.failed');
      expect(PLUGIN_EVENT_TYPES.Updated).toBe('plugin.updated');
      expect(PLUGIN_EVENT_TYPES.Removed).toBe('plugin.removed');
    });
  });

  describe('createPluginInstalledEvent', () => {
    it('creates a DomainEvent with Installed type', () => {
      const event = createPluginInstalledEvent('my-plugin', {
        pluginId: 'my-plugin',
        version: '1.0.0',
        directory: '/dir',
      });
      expect(event.eventType).toBe(PLUGIN_EVENT_TYPES.Installed);
      expect(event.aggregateId).toBe('my-plugin');
      expect(event.payload).toMatchObject({ pluginId: 'my-plugin', version: '1.0.0' });
    });
  });

  describe('createPluginStartedEvent', () => {
    it('creates a DomainEvent with Started type', () => {
      const event = createPluginStartedEvent('my-plugin', { pluginId: 'my-plugin', version: '1.0.0' });
      expect(event.eventType).toBe(PLUGIN_EVENT_TYPES.Started);
    });
  });

  describe('createPluginStoppedEvent', () => {
    it('creates a DomainEvent with Stopped type', () => {
      const event = createPluginStoppedEvent('my-plugin', { pluginId: 'my-plugin', version: '1.0.0' });
      expect(event.eventType).toBe(PLUGIN_EVENT_TYPES.Stopped);
    });
  });

  describe('createPluginFailedEvent', () => {
    it('creates a DomainEvent with Failed type including error and operation', () => {
      const event = createPluginFailedEvent('my-plugin', {
        pluginId: 'my-plugin',
        version: '1.0.0',
        error: 'timeout',
        operation: 'start',
      });
      expect(event.eventType).toBe(PLUGIN_EVENT_TYPES.Failed);
      expect(event.payload).toMatchObject({ error: 'timeout', operation: 'start' });
    });
  });

  describe('createPluginUpdatedEvent', () => {
    it('creates a DomainEvent with Updated type', () => {
      const event = createPluginUpdatedEvent('my-plugin', {
        pluginId: 'my-plugin',
        previousVersion: '1.0.0',
        newVersion: '2.0.0',
      });
      expect(event.eventType).toBe(PLUGIN_EVENT_TYPES.Updated);
      expect(event.payload).toMatchObject({ previousVersion: '1.0.0', newVersion: '2.0.0' });
    });
  });

  describe('createPluginRemovedEvent', () => {
    it('creates a DomainEvent with Removed type', () => {
      const event = createPluginRemovedEvent('my-plugin', { pluginId: 'my-plugin', version: '1.0.0' });
      expect(event.eventType).toBe(PLUGIN_EVENT_TYPES.Removed);
    });
  });

  it('all events have eventId and occurredAt', () => {
    const event = createPluginInstalledEvent('p', { pluginId: 'p', version: '1.0.0', directory: '/d' });
    expect(event.eventId).toBeDefined();
    expect(event.occurredAt).toBeInstanceOf(Date);
  });
});
