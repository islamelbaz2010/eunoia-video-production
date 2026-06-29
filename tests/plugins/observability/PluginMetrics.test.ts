import { PluginMetrics } from '../../../src/plugins/observability/PluginMetrics';

describe('PluginMetrics', () => {
  let metrics: PluginMetrics;

  beforeEach(() => {
    metrics = new PluginMetrics();
  });

  it('getStats initializes and returns default zeros', () => {
    const s = metrics.getStats('new-plugin');
    expect(s.failures).toBe(0);
    expect(s.restarts).toBe(0);
    expect(s.crashes).toBe(0);
    expect(s.executionCount).toBe(0);
    expect(s.loadTimeMs).toBe(0);
  });

  describe('recordLoad', () => {
    it('sets loadTimeMs', () => {
      metrics.recordLoad('plugin-a', 42);
      expect(metrics.getStats('plugin-a').loadTimeMs).toBe(42);
    });
  });

  describe('recordFailure', () => {
    it('increments failure count and sets lastFailureAt', () => {
      metrics.recordLoad('plugin-a', 1);
      metrics.recordFailure('plugin-a');
      metrics.recordFailure('plugin-a');
      const s = metrics.getStats('plugin-a');
      expect(s.failures).toBe(2);
      expect(s.lastFailureAt).toBeInstanceOf(Date);
    });

    it('creates entry if not initialized', () => {
      metrics.recordFailure('new-plugin');
      expect(metrics.getStats('new-plugin').failures).toBe(1);
    });
  });

  describe('recordRestart', () => {
    it('increments restart count', () => {
      metrics.recordRestart('plugin-a');
      expect(metrics.getStats('plugin-a').restarts).toBe(1);
    });
  });

  describe('recordCrash', () => {
    it('increments crash count and sets lastCrashAt', () => {
      metrics.recordCrash('plugin-a');
      metrics.recordCrash('plugin-a');
      const s = metrics.getStats('plugin-a');
      expect(s.crashes).toBe(2);
      expect(s.lastCrashAt).toBeInstanceOf(Date);
    });
  });

  describe('incrementExecutionCount', () => {
    it('increments executionCount', () => {
      metrics.incrementExecutionCount('plugin-a');
      metrics.incrementExecutionCount('plugin-a');
      metrics.incrementExecutionCount('plugin-a');
      expect(metrics.getStats('plugin-a').executionCount).toBe(3);
    });
  });

  describe('getAllStats', () => {
    it('returns stats for all plugins', () => {
      metrics.recordLoad('p1', 10);
      metrics.recordLoad('p2', 20);
      const all = metrics.getAllStats();
      expect(all.size).toBe(2);
      expect(all.get('p1')!.loadTimeMs).toBe(10);
    });

    it('returns empty map when no plugins recorded', () => {
      expect(metrics.getAllStats().size).toBe(0);
    });
  });
});
