export enum ExecutionStatus {
  Pending = 'pending',
  Waiting = 'waiting',
  Ready = 'ready',
  Running = 'running',
  Succeeded = 'succeeded',
  Failed = 'failed',
  Cancelled = 'cancelled',
  Retrying = 'retrying',
  Skipped = 'skipped',
}

export const TERMINAL_STATUSES: ReadonlySet<ExecutionStatus> = new Set([
  ExecutionStatus.Succeeded,
  ExecutionStatus.Failed,
  ExecutionStatus.Cancelled,
  ExecutionStatus.Skipped,
]);
