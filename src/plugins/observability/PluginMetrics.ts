export interface PluginStats {
  readonly pluginId: string;
  readonly loadTimeMs: number;
  readonly failures: number;
  readonly restarts: number;
  readonly crashes: number;
  readonly executionCount: number;
  readonly lastFailureAt: Date | null;
  readonly lastCrashAt: Date | null;
}

interface MutableStats {
  pluginId: string;
  loadTimeMs: number;
  failures: number;
  restarts: number;
  crashes: number;
  executionCount: number;
  lastFailureAt: Date | null;
  lastCrashAt: Date | null;
}

export class PluginMetrics {
  private readonly stats = new Map<string, MutableStats>();

  recordLoad(pluginId: string, loadTimeMs: number): void {
    const s = this.getOrCreate(pluginId);
    s.loadTimeMs = loadTimeMs;
  }

  recordFailure(pluginId: string): void {
    const s = this.getOrCreate(pluginId);
    s.failures += 1;
    s.lastFailureAt = new Date();
  }

  recordRestart(pluginId: string): void {
    this.getOrCreate(pluginId).restarts += 1;
  }

  recordCrash(pluginId: string): void {
    const s = this.getOrCreate(pluginId);
    s.crashes += 1;
    s.lastCrashAt = new Date();
  }

  incrementExecutionCount(pluginId: string): void {
    this.getOrCreate(pluginId).executionCount += 1;
  }

  getStats(pluginId: string): PluginStats {
    return { ...this.getOrCreate(pluginId) };
  }

  getAllStats(): ReadonlyMap<string, PluginStats> {
    const result = new Map<string, PluginStats>();
    for (const [id, s] of this.stats) {
      result.set(id, { ...s });
    }
    return result;
  }

  private getOrCreate(pluginId: string): MutableStats {
    if (!this.stats.has(pluginId)) {
      this.stats.set(pluginId, {
        pluginId,
        loadTimeMs: 0,
        failures: 0,
        restarts: 0,
        crashes: 0,
        executionCount: 0,
        lastFailureAt: null,
        lastCrashAt: null,
      });
    }
    return this.stats.get(pluginId)!;
  }
}
