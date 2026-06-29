import { PluginCircularDependencyError, PluginDependencyError } from '../core/errors/PluginError';
import type { PluginManifest } from '../contracts/PluginManifest';

export function satisfiesVersionConstraint(version: string, constraint: string): boolean {
  const exact = constraint.match(/^(\d+\.\d+\.\d+)$/);
  if (exact !== null) return version === constraint;

  const gte = constraint.match(/^>=(\d+\.\d+\.\d+)$/);
  if (gte !== null) return compareVersions(version, gte[1]!) >= 0;

  const gt = constraint.match(/^>(\d+\.\d+\.\d+)$/);
  if (gt !== null) return compareVersions(version, gt[1]!) > 0;

  const lte = constraint.match(/^<=(\d+\.\d+\.\d+)$/);
  if (lte !== null) return compareVersions(version, lte[1]!) <= 0;

  const lt = constraint.match(/^<(\d+\.\d+\.\d+)$/);
  if (lt !== null) return compareVersions(version, lt[1]!) < 0;

  const caret = constraint.match(/^\^(\d+)\.(\d+)\.(\d+)$/);
  if (caret !== null) {
    const [, major] = caret;
    const [vMajor] = version.split('.');
    return vMajor === major && compareVersions(version, constraint.slice(1)) >= 0;
  }

  const tilde = constraint.match(/^~(\d+)\.(\d+)\.(\d+)$/);
  if (tilde !== null) {
    const [, major, minor] = tilde;
    const [vMajor, vMinor] = version.split('.');
    return vMajor === major && vMinor === minor && compareVersions(version, constraint.slice(1)) >= 0;
  }

  return version === constraint;
}

function compareVersions(a: string, b: string): number {
  const [aMaj = 0, aMin = 0, aPatch = 0] = a.split('.').map(Number);
  const [bMaj = 0, bMin = 0, bPatch = 0] = b.split('.').map(Number);

  if (aMaj !== bMaj) return aMaj - bMaj;
  if (aMin !== bMin) return aMin - bMin;
  return aPatch - bPatch;
}

export function resolveLoadOrder(manifests: PluginManifest[]): PluginManifest[] {
  const byId = new Map<string, PluginManifest>(manifests.map(m => [m.id, m]));
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const order: PluginManifest[] = [];

  function visit(id: string, stack: string[]): void {
    if (visited.has(id)) return;

    if (inStack.has(id)) {
      const cycleStart = stack.indexOf(id);
      throw new PluginCircularDependencyError([...stack.slice(cycleStart), id]);
    }

    const manifest = byId.get(id);
    if (manifest === undefined) return;

    inStack.add(id);
    stack.push(id);

    for (const dep of manifest.dependencies) {
      if (dep.required && !byId.has(dep.pluginId)) {
        throw new PluginDependencyError(id, dep.pluginId);
      }
      if (byId.has(dep.pluginId)) {
        visit(dep.pluginId, stack);
      }
    }

    stack.pop();
    inStack.delete(id);
    visited.add(id);
    order.push(manifest);
  }

  for (const manifest of manifests) {
    visit(manifest.id, []);
  }

  return order;
}

export function validateDependencies(
  manifest: PluginManifest,
  registeredVersions: Map<string, string>,
): void {
  for (const dep of manifest.dependencies) {
    if (!dep.required) continue;

    const version = registeredVersions.get(dep.pluginId);
    if (version === undefined) {
      throw new PluginDependencyError(manifest.id, dep.pluginId);
    }

    if (!satisfiesVersionConstraint(version, dep.versionConstraint)) {
      throw new PluginDependencyError(manifest.id, dep.pluginId);
    }
  }
}
