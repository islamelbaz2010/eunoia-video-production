import {
  resolveLoadOrder,
  satisfiesVersionConstraint,
  validateDependencies,
} from '../../../src/plugins/loader/DependencyResolver';
import {
  PluginCircularDependencyError,
  PluginDependencyError,
} from '../../../src/plugins/core/errors/PluginError';
import { makeManifest } from '../helpers';
import type { PluginManifest } from '../../../src/plugins/contracts/PluginManifest';

function m(id: string, deps: Array<{ pluginId: string; required: boolean; versionConstraint?: string }> = []): PluginManifest {
  return makeManifest({
    id,
    dependencies: deps.map(d => ({ pluginId: d.pluginId, required: d.required, versionConstraint: d.versionConstraint ?? '>=1.0.0' })),
  });
}

describe('satisfiesVersionConstraint', () => {
  it('exact match', () => {
    expect(satisfiesVersionConstraint('1.2.3', '1.2.3')).toBe(true);
    expect(satisfiesVersionConstraint('1.2.3', '1.2.4')).toBe(false);
  });

  it('>= constraint', () => {
    expect(satisfiesVersionConstraint('2.0.0', '>=1.0.0')).toBe(true);
    expect(satisfiesVersionConstraint('1.0.0', '>=1.0.0')).toBe(true);
    expect(satisfiesVersionConstraint('0.9.0', '>=1.0.0')).toBe(false);
  });

  it('> constraint', () => {
    expect(satisfiesVersionConstraint('2.0.0', '>1.0.0')).toBe(true);
    expect(satisfiesVersionConstraint('1.0.0', '>1.0.0')).toBe(false);
  });

  it('<= constraint', () => {
    expect(satisfiesVersionConstraint('1.0.0', '<=2.0.0')).toBe(true);
    expect(satisfiesVersionConstraint('3.0.0', '<=2.0.0')).toBe(false);
  });

  it('< constraint', () => {
    expect(satisfiesVersionConstraint('1.0.0', '<2.0.0')).toBe(true);
    expect(satisfiesVersionConstraint('2.0.0', '<2.0.0')).toBe(false);
  });

  it('^ caret constraint (same major)', () => {
    expect(satisfiesVersionConstraint('1.5.0', '^1.0.0')).toBe(true);
    expect(satisfiesVersionConstraint('2.0.0', '^1.0.0')).toBe(false);
  });

  it('~ tilde constraint (same major.minor)', () => {
    expect(satisfiesVersionConstraint('1.2.5', '~1.2.0')).toBe(true);
    expect(satisfiesVersionConstraint('1.3.0', '~1.2.0')).toBe(false);
  });

  it('falls back to exact match for unknown format', () => {
    expect(satisfiesVersionConstraint('1.0.0', '1.0.0')).toBe(true);
  });
});

describe('resolveLoadOrder', () => {
  it('returns manifests in dependency-first order', () => {
    const core = m('core');
    const plugin = m('plugin', [{ pluginId: 'core', required: true }]);
    const order = resolveLoadOrder([plugin, core]);
    const ids = order.map(x => x.id);
    expect(ids.indexOf('core')).toBeLessThan(ids.indexOf('plugin'));
  });

  it('handles no dependencies', () => {
    const a = m('a');
    const b = m('b');
    const order = resolveLoadOrder([a, b]);
    expect(order).toHaveLength(2);
  });

  it('handles transitive dependencies', () => {
    const a = m('a');
    const b = m('b', [{ pluginId: 'a', required: true }]);
    const c = m('c', [{ pluginId: 'b', required: true }]);
    const order = resolveLoadOrder([c, a, b]);
    const ids = order.map(x => x.id);
    expect(ids.indexOf('a')).toBeLessThan(ids.indexOf('b'));
    expect(ids.indexOf('b')).toBeLessThan(ids.indexOf('c'));
  });

  it('throws PluginCircularDependencyError on cycle', () => {
    const a = m('a', [{ pluginId: 'b', required: true }]);
    const b = m('b', [{ pluginId: 'a', required: true }]);
    expect(() => resolveLoadOrder([a, b])).toThrow(PluginCircularDependencyError);
  });

  it('throws PluginDependencyError when required dep is missing', () => {
    const plugin = m('plugin', [{ pluginId: 'missing', required: true }]);
    expect(() => resolveLoadOrder([plugin])).toThrow(PluginDependencyError);
  });

  it('does not throw when optional dep is missing', () => {
    const plugin = m('plugin', [{ pluginId: 'missing', required: false }]);
    expect(() => resolveLoadOrder([plugin])).not.toThrow();
  });
});

describe('validateDependencies', () => {
  it('passes when all required deps are satisfied', () => {
    const manifest = m('plugin', [{ pluginId: 'core', required: true, versionConstraint: '>=1.0.0' }]);
    const registered = new Map([['core', '1.5.0']]);
    expect(() => validateDependencies(manifest, registered)).not.toThrow();
  });

  it('throws when required dep is missing', () => {
    const manifest = m('plugin', [{ pluginId: 'core', required: true }]);
    expect(() => validateDependencies(manifest, new Map())).toThrow(PluginDependencyError);
  });

  it('throws when version constraint is not satisfied', () => {
    const manifest = m('plugin', [{ pluginId: 'core', required: true, versionConstraint: '>=2.0.0' }]);
    const registered = new Map([['core', '1.0.0']]);
    expect(() => validateDependencies(manifest, registered)).toThrow(PluginDependencyError);
  });

  it('skips optional missing deps', () => {
    const manifest = m('plugin', [{ pluginId: 'optional-dep', required: false }]);
    expect(() => validateDependencies(manifest, new Map())).not.toThrow();
  });
});
