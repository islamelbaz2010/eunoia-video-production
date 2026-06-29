import type { IMetricsService, MetricsSnapshot } from './IMetricsService';

export class MetricsService implements IMetricsService {
  private jobsExecuted = 0;
  private jobsFailed = 0;
  private totalExecutionTimeMs = 0;
  private executionCount = 0;
  private queueLength = 0;
  private readonly providerLatencies = new Map<string, { total: number; count: number }>();

  incrementJobsExecuted(): void {
    this.jobsExecuted += 1;
  }

  incrementJobsFailed(): void {
    this.jobsFailed += 1;
  }

  recordExecutionTime(durationMs: number): void {
    this.totalExecutionTimeMs += durationMs;
    this.executionCount += 1;
  }

  recordProviderLatency(provider: string, latencyMs: number): void {
    const existing = this.providerLatencies.get(provider) ?? { total: 0, count: 0 };
    this.providerLatencies.set(provider, {
      total: existing.total + latencyMs,
      count: existing.count + 1,
    });
  }

  setQueueLength(n: number): void {
    this.queueLength = n;
  }

  getSnapshot(): MetricsSnapshot {
    const providerLatency: Record<string, number> = {};
    for (const [name, stats] of this.providerLatencies) {
      providerLatency[name] = stats.count > 0 ? stats.total / stats.count : 0;
    }

    return {
      jobsExecuted: this.jobsExecuted,
      jobsFailed: this.jobsFailed,
      averageExecutionTimeMs:
        this.executionCount > 0 ? this.totalExecutionTimeMs / this.executionCount : 0,
      queueLength: this.queueLength,
      providerLatency,
    };
  }
}
