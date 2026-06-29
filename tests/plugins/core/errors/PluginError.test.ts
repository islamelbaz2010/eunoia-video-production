import {
  PluginAlreadyRegisteredError,
  PluginCircularDependencyError,
  PluginConfigurationError,
  PluginDependencyError,
  PluginLifecycleError,
  PluginManifestError,
  PluginNotFoundError,
  PluginPermissionError,
} from '../../../../src/plugins/core/errors/PluginError';
import { AppError } from '../../../../src/shared/errors/AppError';

describe('Plugin Errors', () => {
  it('PluginNotFoundError extends AppError with correct code', () => {
    const e = new PluginNotFoundError('my-plugin');
    expect(e).toBeInstanceOf(AppError);
    expect(e.code).toBe('PLUGIN_NOT_FOUND');
    expect(e.message).toContain('my-plugin');
  });

  it('PluginAlreadyRegisteredError has correct code', () => {
    const e = new PluginAlreadyRegisteredError('my-plugin');
    expect(e.code).toBe('PLUGIN_ALREADY_REGISTERED');
    expect(e.message).toContain('my-plugin');
  });

  it('PluginDependencyError contains both ids in message', () => {
    const e = new PluginDependencyError('plugin-a', 'plugin-b');
    expect(e.code).toBe('PLUGIN_DEPENDENCY_ERROR');
    expect(e.message).toContain('plugin-a');
    expect(e.message).toContain('plugin-b');
  });

  it('PluginCircularDependencyError shows cycle path', () => {
    const e = new PluginCircularDependencyError(['a', 'b', 'c', 'a']);
    expect(e.code).toBe('PLUGIN_CIRCULAR_DEPENDENCY');
    expect(e.message).toContain('a → b → c → a');
  });

  it('PluginManifestError has correct code', () => {
    const e = new PluginManifestError('Missing field');
    expect(e.code).toBe('PLUGIN_MANIFEST_ERROR');
  });

  it('PluginLifecycleError includes operation in message', () => {
    const e = new PluginLifecycleError('plug', 'start', 'timeout');
    expect(e.code).toBe('PLUGIN_LIFECYCLE_ERROR');
    expect(e.message).toContain('start');
    expect(e.message).toContain('timeout');
  });

  it('PluginPermissionError shows permission in message', () => {
    const e = new PluginPermissionError('plug', 'ai');
    expect(e.code).toBe('PLUGIN_PERMISSION_ERROR');
    expect(e.message).toContain('ai');
  });

  it('PluginConfigurationError lists errors in message', () => {
    const e = new PluginConfigurationError('plug', ["'key' is required"]);
    expect(e.code).toBe('PLUGIN_CONFIGURATION_ERROR');
    expect(e.message).toContain("'key' is required");
  });
});
