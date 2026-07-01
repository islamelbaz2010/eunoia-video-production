import { randomUUID } from 'crypto';
import { JobStatus } from '../../../core/queue/types';
import type { ProcessingJobType } from './ProcessingJobType';

export interface ProcessingJobProps {
  id: string;
  assetId: string;
  channelId: string;
  type: ProcessingJobType;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  scheduledAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}

export interface CreateProcessingJobProps {
  assetId: string;
  channelId: string;
  type: ProcessingJobType;
  maxAttempts?: number;
}

export class ProcessingJob {
  readonly id: string;
  readonly assetId: string;
  readonly channelId: string;
  readonly type: ProcessingJobType;
  readonly status: JobStatus;
  readonly attempts: number;
  readonly maxAttempts: number;
  readonly lastError: string | null;
  readonly scheduledAt: Date;
  readonly startedAt: Date | null;
  readonly completedAt: Date | null;

  private constructor(props: ProcessingJobProps) {
    this.id = props.id;
    this.assetId = props.assetId;
    this.channelId = props.channelId;
    this.type = props.type;
    this.status = props.status;
    this.attempts = props.attempts;
    this.maxAttempts = props.maxAttempts;
    this.lastError = props.lastError;
    this.scheduledAt = new Date(props.scheduledAt);
    this.startedAt = props.startedAt !== null ? new Date(props.startedAt) : null;
    this.completedAt = props.completedAt !== null ? new Date(props.completedAt) : null;
  }

  static create(props: CreateProcessingJobProps): ProcessingJob {
    return new ProcessingJob({
      id: randomUUID(),
      assetId: props.assetId,
      channelId: props.channelId,
      type: props.type,
      status: JobStatus.Pending,
      attempts: 0,
      maxAttempts: props.maxAttempts ?? 3,
      lastError: null,
      scheduledAt: new Date(),
      startedAt: null,
      completedAt: null,
    });
  }

  static reconstitute(props: ProcessingJobProps): ProcessingJob {
    return new ProcessingJob(props);
  }

  private toProps(): ProcessingJobProps {
    return {
      id: this.id,
      assetId: this.assetId,
      channelId: this.channelId,
      type: this.type,
      status: this.status,
      attempts: this.attempts,
      maxAttempts: this.maxAttempts,
      lastError: this.lastError,
      scheduledAt: new Date(this.scheduledAt),
      startedAt: this.startedAt !== null ? new Date(this.startedAt) : null,
      completedAt: this.completedAt !== null ? new Date(this.completedAt) : null,
    };
  }

  withStatus(status: JobStatus): ProcessingJob {
    return ProcessingJob.reconstitute({ ...this.toProps(), status });
  }

  withStarted(): ProcessingJob {
    return ProcessingJob.reconstitute({
      ...this.toProps(),
      status: JobStatus.Running,
      startedAt: new Date(),
    });
  }

  withCompleted(): ProcessingJob {
    return ProcessingJob.reconstitute({
      ...this.toProps(),
      status: JobStatus.Completed,
      completedAt: new Date(),
    });
  }

  withFailed(error: string): ProcessingJob {
    return ProcessingJob.reconstitute({
      ...this.toProps(),
      status: JobStatus.Failed,
      attempts: this.attempts + 1,
      lastError: error,
    });
  }

  isTerminal(): boolean {
    return (
      this.status === JobStatus.Completed ||
      this.status === JobStatus.Failed ||
      this.status === JobStatus.Cancelled
    );
  }
}
