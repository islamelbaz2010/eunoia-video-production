import { validateManifest } from '../../../src/plugins/loader/ManifestValidator';
import { PluginManifestError } from '../../../src/plugins/core/errors/PluginError';
import { PluginPermission } from '../../../src/plugins/contracts/PluginPermission';

function validRaw() {
  return {
    id: 'test-plugin',
    name: 'Test Plugin',
    version: '1.0.0',
    description: 'A test',
    author: 'Author',
    entryPoint: 'index.js',
    permissions: [PluginPermission.AI],
    capabilities: [],
    dependencies: [],
    configSchema: {},
    minEngineVersion: '1.0.0',
    tags: ['test'],
  };
}

describe('validateManifest', () => {
  it('accepts a valid manifest', () => {
    expect(() => validateManifest(validRaw())).not.toThrow();
  });

  it('returns the manifest object', () => {
    const manifest = validateManifest(validRaw());
    expect(manifest.id).toBe('test-plugin');
  });

  it('throws on null input', () => {
    expect(() => validateManifest(null)).toThrow(PluginManifestError);
  });

  it('throws on non-object input', () => {
    expect(() => validateManifest('string')).toThrow(PluginManifestError);
  });

  it.each(['id', 'name', 'version', 'description', 'author', 'entryPoint', 'minEngineVersion'])(
    'throws when %s is missing',
    field => {
      const raw = { ...validRaw(), [field]: undefined };
      expect(() => validateManifest(raw)).toThrow(PluginManifestError);
    },
  );

  it('throws when version is not semver', () => {
    expect(() => validateManifest({ ...validRaw(), version: 'not-semver' })).toThrow(PluginManifestError);
  });

  it('throws when minEngineVersion is not semver', () => {
    expect(() => validateManifest({ ...validRaw(), minEngineVersion: 'v1' })).toThrow(PluginManifestError);
  });

  it('throws when permissions contains invalid value', () => {
    expect(() => validateManifest({ ...validRaw(), permissions: ['invalid'] })).toThrow(PluginManifestError);
  });

  it('throws when capabilities is not an array', () => {
    expect(() => validateManifest({ ...validRaw(), capabilities: {} })).toThrow(PluginManifestError);
  });

  it('throws when configSchema is not an object', () => {
    expect(() => validateManifest({ ...validRaw(), configSchema: 'bad' })).toThrow(PluginManifestError);
  });

  it('throws when configSchema field has invalid type', () => {
    expect(() =>
      validateManifest({
        ...validRaw(),
        configSchema: { key: { type: 'invalid', required: true, description: 'desc' } },
      }),
    ).toThrow(PluginManifestError);
  });

  it('throws when configSchema field missing required', () => {
    expect(() =>
      validateManifest({
        ...validRaw(),
        configSchema: { key: { type: 'string', description: 'desc' } },
      }),
    ).toThrow(PluginManifestError);
  });

  it('accepts valid configSchema with all types', () => {
    const raw = {
      ...validRaw(),
      configSchema: {
        strField: { type: 'string', required: true, description: 'd' },
        numField: { type: 'number', required: false, description: 'd', default: 42 },
        boolField: { type: 'boolean', required: false, description: 'd' },
        secretField: { type: 'secret', required: true, description: 'd' },
      },
    };
    expect(() => validateManifest(raw)).not.toThrow();
  });
});
