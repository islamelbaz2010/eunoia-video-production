export enum JobStatus {
  Pending = 'pending',
  Running = 'running',
  Completed = 'completed',
  Failed = 'failed',
  Cancelled = 'cancelled',
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffMs: number;
}

export interface Job<T = unknown> {
  readonly id: string;
  readonly type: string;
  readonly payload: T;
  readonly priority: number;
  readonly status: JobStatus;
  readonly attempts: number;
  readonly maxAttempts: number;
  readonly runAt: Date;
  readonly createdAt: Date;
  readonly completedAt: Date | null;
  readonly error: string | null;
}

export interface DeadLetterEntry<T = unknown> {
  readonly job: Job<T>;
  readonly failedAt: Date;
  readonly lastError: string;
}
