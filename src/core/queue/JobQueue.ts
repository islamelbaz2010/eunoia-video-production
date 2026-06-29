import { randomUUID } from 'crypto';
import type { ILogger } from '../../shared/logger/ILogger';
import { type DeadLetterEntry, type Job, JobStatus, type RetryPolicy } from './types';

export interface EnqueueOptions<T> {
  priority?: number;
  runAt?: Date;
  retryPolicy?: RetryPolicy;
  payload: T;
  type: string;
}

interface MutableJob<T> {
  id: string;
  type: string;
  payload: T;
  priority: number;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  runAt: Date;
  createdAt: Date;
  completedAt: Date | null;
  error: string | null;
}

export interface JobQueueOptions {
  defaultRetryPolicy: RetryPolicy;
}

export class JobQueue<T = unknown> {
  private readonly jobs = new Map<string, MutableJob<T>>();
  private readonly deadLetterQueue: Array<DeadLetterEntry<T>> = [];
  private readonly defaultRetryPolicy: RetryPolicy;

  constructor(
    options: JobQueueOptions,
    private readonly logger: ILogger,
  ) {
    this.defaultRetryPolicy = options.defaultRetryPolicy;
  }

  enqueue(
    type: string,
    payload: T,
    options?: { priority?: number; runAt?: Date; retryPolicy?: RetryPolicy },
  ): Job<T> {
    const policy = options?.retryPolicy ?? this.defaultRetryPolicy;
    const job: MutableJob<T> = {
      id: randomUUID(),
      type,
      payload,
      priority: options?.priority ?? 0,
      status: JobStatus.Pending,
      attempts: 0,
      maxAttempts: policy.maxAttempts,
      runAt: options?.runAt ?? new Date(),
      createdAt: new Date(),
      completedAt: null,
      error: null,
    };

    this.jobs.set(job.id, job);
    this.logger.debug({ jobId: job.id, type, priority: job.priority }, 'Job enqueued');
    return job as Job<T>;
  }

  dequeue(): Job<T> | undefined {
    const now = new Date();
    const candidates = [...this.jobs.values()].filter(
      j => j.status === JobStatus.Pending && j.runAt <= now,
    );

    if (candidates.length === 0) {
      return undefined;
    }

    candidates.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    const job = candidates[0];
    if (job === undefined) return undefined;

    job.status = JobStatus.Running;
    job.attempts += 1;
    this.logger.debug({ jobId: job.id, attempt: job.attempts }, 'Job dequeued');
    return job as Job<T>;
  }

  acknowledge(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (job === undefined) return;

    job.status = JobStatus.Completed;
    job.completedAt = new Date();
    this.logger.debug({ jobId }, 'Job acknowledged');
  }

  fail(jobId: string, error: string): void {
    const job = this.jobs.get(jobId);
    if (job === undefined) return;

    job.error = error;

    if (job.attempts < job.maxAttempts) {
      const backoffMs = this.defaultRetryPolicy.backoffMs * Math.pow(2, job.attempts - 1);
      job.status = JobStatus.Pending;
      job.runAt = new Date(Date.now() + backoffMs);
      this.logger.warn({ jobId, attempt: job.attempts, nextRunAt: job.runAt }, 'Job failed, retrying');
    } else {
      job.status = JobStatus.Failed;
      job.completedAt = new Date();
      this.deadLetterQueue.push({ job: { ...job } as Job<T>, failedAt: new Date(), lastError: error });
      this.logger.error({ jobId, attempts: job.attempts }, 'Job moved to dead letter queue');
    }
  }

  cancel(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (job === undefined) return;

    job.status = JobStatus.Cancelled;
    this.logger.debug({ jobId }, 'Job cancelled');
  }

  getJob(jobId: string): Job<T> | undefined {
    const job = this.jobs.get(jobId);
    return job as Job<T> | undefined;
  }

  getDeadLetterQueue(): ReadonlyArray<DeadLetterEntry<T>> {
    return this.deadLetterQueue;
  }

  getPendingCount(): number {
    return [...this.jobs.values()].filter(j => j.status === JobStatus.Pending).length;
  }

  getRunningCount(): number {
    return [...this.jobs.values()].filter(j => j.status === JobStatus.Running).length;
  }

  getQueueLength(): number {
    return this.getPendingCount() + this.getRunningCount();
  }
}
