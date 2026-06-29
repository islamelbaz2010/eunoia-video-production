import type { ConfigField } from '../contracts/ConfigField';

export class PluginConfigValidator {
  validate(schema: Record<string, ConfigField>, config: Record<string, unknown>): string[] {
    const errors: string[] = [];

    for (const [key, field] of Object.entries(schema)) {
      const value = config[key];

      if (field.required && (value === undefined || value === null || value === '')) {
        errors.push(`'${key}' is required`);
        continue;
      }

      if (value === undefined || value === null) continue;

      const expectedType = field.type === 'secret' ? 'string' : field.type;
      if (typeof value !== expectedType) {
        errors.push(`'${key}' must be of type '${field.type}', got '${typeof value}'`);
      }
    }

    return errors;
  }

  applyDefaults(
    schema: Record<string, ConfigField>,
    config: Record<string, unknown>,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = { ...config };

    for (const [key, field] of Object.entries(schema)) {
      if (result[key] === undefined && field.default !== undefined) {
        result[key] = field.default;
      }
    }

    return result;
  }
}
