import { createDomainEvent, type DomainEvent } from '../../core/events/DomainEvent';

export const PLUGIN_EVENT_TYPES = {
  Installed: 'plugin.installed',
  Started: 'plugin.started',
  Stopped: 'plugin.stopped',
  Failed: 'plugin.failed',
  Updated: 'plugin.updated',
  Removed: 'plugin.removed',
  Paused: 'plugin.paused',
  Resumed: 'plugin.resumed',
} as const;

export type PluginEventType = (typeof PLUGIN_EVENT_TYPES)[keyof typeof PLUGIN_EVENT_TYPES];

export interface PluginInstalledPayload {
  readonly pluginId: string;
  readonly version: string;
  readonly directory: string;
}

export interface PluginStartedPayload {
  readonly pluginId: string;
  readonly version: string;
}

export interface PluginStoppedPayload {
  readonly pluginId: string;
  readonly version: string;
}

export interface PluginFailedPayload {
  readonly pluginId: string;
  readonly version: string;
  readonly error: string;
  readonly operation: string;
}

export interface PluginUpdatedPayload {
  readonly pluginId: string;
  readonly previousVersion: string;
  readonly newVersion: string;
}

export interface PluginRemovedPayload {
  readonly pluginId: string;
  readonly version: string;
}

export function createPluginInstalledEvent(
  pluginId: string,
  payload: PluginInstalledPayload,
): DomainEvent {
  return createDomainEvent(PLUGIN_EVENT_TYPES.Installed, pluginId, payload);
}

export function createPluginStartedEvent(
  pluginId: string,
  payload: PluginStartedPayload,
): DomainEvent {
  return createDomainEvent(PLUGIN_EVENT_TYPES.Started, pluginId, payload);
}

export function createPluginStoppedEvent(
  pluginId: string,
  payload: PluginStoppedPayload,
): DomainEvent {
  return createDomainEvent(PLUGIN_EVENT_TYPES.Stopped, pluginId, payload);
}

export function createPluginFailedEvent(
  pluginId: string,
  payload: PluginFailedPayload,
): DomainEvent {
  return createDomainEvent(PLUGIN_EVENT_TYPES.Failed, pluginId, payload);
}

export function createPluginUpdatedEvent(
  pluginId: string,
  payload: PluginUpdatedPayload,
): DomainEvent {
  return createDomainEvent(PLUGIN_EVENT_TYPES.Updated, pluginId, payload);
}

export function createPluginRemovedEvent(
  pluginId: string,
  payload: PluginRemovedPayload,
): DomainEvent {
  return createDomainEvent(PLUGIN_EVENT_TYPES.Removed, pluginId, payload);
}
