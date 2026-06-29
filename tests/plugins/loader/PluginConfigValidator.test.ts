import { PluginConfigValidator } from '../../../src/plugins/loader/PluginConfigValidator';
import type { ConfigField } from '../../../src/plugins/contracts/ConfigField';

const schema: Record<string, ConfigField> = {
  apiKey: { type: 'secret', required: true, description: 'API Key' },
  timeout: { type: 'number', required: false, description: 'Timeout ms', default: 5000 },
  debug: { type: 'boolean', required: false, description: 'Enable debug' },
};

describe('PluginConfigValidator', () => {
  let validator: PluginConfigValidator;

  beforeEach(() => {
    validator = new PluginConfigValidator();
  });

  describe('validate', () => {
    it('returns no errors for valid config', () => {
      const errors = validator.validate(schema, { apiKey: 'sk-abc', timeout: 3000 });
      expect(errors).toHaveLength(0);
    });

    it('returns error when required field is missing', () => {
      const errors = validator.validate(schema, {});
      expect(errors.some(e => e.includes('apiKey'))).toBe(true);
    });

    it('returns error when field has wrong type', () => {
      const errors = validator.validate(schema, { apiKey: 'key', timeout: 'not-a-number' });
      expect(errors.some(e => e.includes('timeout'))).toBe(true);
    });

    it('treats secret fields as strings', () => {
      const errors = validator.validate(schema, { apiKey: 'valid-string' });
      expect(errors).toHaveLength(0);
    });

    it('returns no errors when optional field is omitted', () => {
      const errors = validator.validate(schema, { apiKey: 'key' });
      expect(errors).toHaveLength(0);
    });
  });

  describe('applyDefaults', () => {
    it('fills in default values for missing fields', () => {
      const result = validator.applyDefaults(schema, { apiKey: 'key' });
      expect(result['timeout']).toBe(5000);
    });

    it('does not override existing values', () => {
      const result = validator.applyDefaults(schema, { apiKey: 'key', timeout: 1000 });
      expect(result['timeout']).toBe(1000);
    });

    it('returns original keys unchanged', () => {
      const result = validator.applyDefaults(schema, { apiKey: 'my-key' });
      expect(result['apiKey']).toBe('my-key');
    });
  });
});
