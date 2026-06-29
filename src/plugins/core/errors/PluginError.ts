import { AppError } from '../../../shared/errors/AppError';

export class PluginNotFoundError extends AppError {
  constructor(pluginId: string) {
    super(`Plugin '${pluginId}' not found`, 'PLUGIN_NOT_FOUND');
  }
}

export class PluginAlreadyRegisteredError extends AppError {
  constructor(pluginId: string) {
    super(`Plugin '${pluginId}' is already registered`, 'PLUGIN_ALREADY_REGISTERED');
  }
}

export class PluginDependencyError extends AppError {
  constructor(pluginId: string, depId: string) {
    super(
      `Plugin '${pluginId}' requires dependency '${depId}' which is not satisfied`,
      'PLUGIN_DEPENDENCY_ERROR',
    );
  }
}

export class PluginCircularDependencyError extends AppError {
  constructor(cycle: string[]) {
    super(`Circular dependency detected: ${cycle.join(' → ')}`, 'PLUGIN_CIRCULAR_DEPENDENCY');
  }
}

export class PluginManifestError extends AppError {
  constructor(message: string) {
    super(message, 'PLUGIN_MANIFEST_ERROR');
  }
}

export class PluginLifecycleError extends AppError {
  constructor(pluginId: string, operation: string, reason: string) {
    super(
      `Plugin '${pluginId}' lifecycle operation '${operation}' failed: ${reason}`,
      'PLUGIN_LIFECYCLE_ERROR',
    );
  }
}

export class PluginPermissionError extends AppError {
  constructor(pluginId: string, permission: string) {
    super(
      `Plugin '${pluginId}' does not have permission: ${permission}`,
      'PLUGIN_PERMISSION_ERROR',
    );
  }
}

export class PluginConfigurationError extends AppError {
  constructor(pluginId: string, errors: string[]) {
    super(
      `Plugin '${pluginId}' configuration invalid: ${errors.join('; ')}`,
      'PLUGIN_CONFIGURATION_ERROR',
    );
  }
}
