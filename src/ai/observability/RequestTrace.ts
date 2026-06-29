import type { ProviderType } from '../domain/types/ProviderType';
import type { TaskType } from '../domain/types/TaskType';

export interface RequestTrace {
  readonly requestId: string;
  readonly provider: ProviderType;
  readonly taskType: TaskType;
  readonly latencyMs: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly estimatedCostUsd: number;
  readonly error: string | null;
  readonly retryCount: number;
  readonly timestamp: Date;
}
