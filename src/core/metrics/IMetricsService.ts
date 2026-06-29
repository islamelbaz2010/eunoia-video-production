export interface MetricsSnapshot {
  jobsExecuted: number;
  jobsFailed: number;
  averageExecutionTimeMs: number;
  queueLength: number;
  providerLatency: Record<string, number>;
}

export interface IMetricsService {
  incrementJobsExecuted(): void;
  incrementJobsFailed(): void;
  recordExecutionTime(durationMs: number): void;
  recordProviderLatency(provider: string, latencyMs: number): void;
  getSnapshot(): MetricsSnapshot;
}
