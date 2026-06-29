import { PluginManifestError } from '../core/errors/PluginError';
import type { PluginManifest } from '../contracts/PluginManifest';
import { PluginPermission } from '../contracts/PluginPermission';

const SEMVER_RE = /^\d+\.\d+\.\d+$/;
const VALID_PERMISSIONS = new Set<string>(Object.values(PluginPermission));
const VALID_FIELD_TYPES = new Set<string>(['string', 'number', 'boolean', 'secret']);

export function validateManifest(raw: unknown): PluginManifest {
  if (typeof raw !== 'object' || raw === null) {
    throw new PluginManifestError('Manifest must be a non-null object');
  }

  const obj = raw as Record<string, unknown>;

  requireString(obj, 'id');
  requireString(obj, 'name');
  requireString(obj, 'version');
  requireString(obj, 'description');
  requireString(obj, 'author');
  requireString(obj, 'entryPoint');
  requireString(obj, 'minEngineVersion');

  if (!SEMVER_RE.test(obj['version'] as string)) {
    throw new PluginManifestError(`Manifest 'version' must be a valid semver string`);
  }

  if (!SEMVER_RE.test(obj['minEngineVersion'] as string)) {
    throw new PluginManifestError(`Manifest 'minEngineVersion' must be a valid semver string`);
  }

  const permissions = requireArray(obj, 'permissions');
  for (const p of permissions) {
    if (!VALID_PERMISSIONS.has(p as string)) {
      throw new PluginManifestError(`Invalid permission: '${String(p)}'`);
    }
  }

  requireArray(obj, 'capabilities');
  requireArray(obj, 'dependencies');
  requireArray(obj, 'tags');

  const schema = obj['configSchema'];
  if (typeof schema !== 'object' || schema === null) {
    throw new PluginManifestError(`Manifest 'configSchema' must be an object`);
  }

  for (const [key, field] of Object.entries(schema as Record<string, unknown>)) {
    if (typeof field !== 'object' || field === null) {
      throw new PluginManifestError(`configSchema field '${key}' must be an object`);
    }
    const f = field as Record<string, unknown>;
    if (!VALID_FIELD_TYPES.has(f['type'] as string)) {
      throw new PluginManifestError(`configSchema field '${key}' has invalid type`);
    }
    if (typeof f['required'] !== 'boolean') {
      throw new PluginManifestError(`configSchema field '${key}' must have a boolean 'required'`);
    }
    if (typeof f['description'] !== 'string') {
      throw new PluginManifestError(`configSchema field '${key}' must have a string 'description'`);
    }
  }

  return obj as unknown as PluginManifest;
}

function requireString(obj: Record<string, unknown>, key: string): void {
  if (typeof obj[key] !== 'string' || (obj[key] as string).length === 0) {
    throw new PluginManifestError(`Manifest '${key}' must be a non-empty string`);
  }
}

function requireArray(obj: Record<string, unknown>, key: string): unknown[] {
  if (!Array.isArray(obj[key])) {
    throw new PluginManifestError(`Manifest '${key}' must be an array`);
  }
  return obj[key] as unknown[];
}
