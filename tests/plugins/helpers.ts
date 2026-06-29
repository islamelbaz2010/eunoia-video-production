import type { IPlugin } from '../../src/plugins/contracts/IPlugin';
import type { PluginContext } from '../../src/plugins/contracts/PluginContext';
import type { PluginManifest } from '../../src/plugins/contracts/PluginManifest';
import { PluginHealthStatus } from '../../src/plugins/contracts/PluginHealth';
import { PluginPermission } from '../../src/plugins/contracts/PluginPermission';
import type { ILogger } from '../../src/shared/logger/ILogger';
import type { IEventBus } from '../../src/core/events/IEventBus';

export function makeLogger(): jest.Mocked<ILogger> {
  return {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: jest.fn().mockReturnThis(),
  } as unknown as jest.Mocked<ILogger>;
}

export function makeEventBus(): jest.Mocked<IEventBus> {
  return {
    publish: jest.fn().mockResolvedValue(undefined),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  };
}

export function makeManifest(overrides: Partial<PluginManifest> = {}): PluginManifest {
  return {
    id: 'test-plugin',
    name: 'Test Plugin',
    version: '1.0.0',
    description: 'A test plugin',
    author: 'Test Author',
    entryPoint: 'index.js',
    permissions: [PluginPermission.AI],
    capabilities: [{ name: 'test-cap', version: '1.0.0', description: 'Test capability' }],
    dependencies: [],
    configSchema: {},
    minEngineVersion: '1.0.0',
    tags: ['test'],
    ...overrides,
  };
}

export function makePlugin(manifest?: PluginManifest): jest.Mocked<IPlugin> {
  return {
    manifest: manifest ?? makeManifest(),
    install: jest.fn().mockResolvedValue(undefined),
    configure: jest.fn().mockResolvedValue(undefined),
    initialize: jest.fn().mockResolvedValue(undefined),
    start: jest.fn().mockResolvedValue(undefined),
    pause: jest.fn().mockResolvedValue(undefined),
    resume: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
    shutdown: jest.fn().mockResolvedValue(undefined),
    health: jest.fn().mockResolvedValue({
      pluginId: manifest?.id ?? 'test-plugin',
      status: PluginHealthStatus.Healthy,
      message: null,
      checkedAt: new Date(),
    }),
    uninstall: jest.fn().mockResolvedValue(undefined),
  };
}

export function makeContext(pluginId = 'test-plugin'): PluginContext {
  return {
    pluginId,
    logger: makeLogger(),
    eventBus: makeEventBus(),
    config: {},
    permissions: [PluginPermission.AI],
  };
}
