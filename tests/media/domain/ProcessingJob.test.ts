import { ProcessingJob } from '../../../src/media/domain/models/ProcessingJob';
import { ProcessingJobType } from '../../../src/media/domain/models/ProcessingJobType';
import { JobStatus } from '../../../src/core/queue/types';

function makeJob(overrides: Partial<Parameters<typeof ProcessingJob.create>[0]> = {}): ProcessingJob {
  return ProcessingJob.create({
    assetId: 'asset-1',
    channelId: 'channel-1',
    type: ProcessingJobType.Validation,
    ...overrides,
  });
}

describe('ProcessingJob', () => {
  describe('create', () => {
    it('sets Pending status, attempts=0, scheduledAt not null', () => {
      const job = makeJob();
      expect(job.id).toBeDefined();
      expect(job.status).toBe(JobStatus.Pending);
      expect(job.attempts).toBe(0);
      expect(job.scheduledAt).toBeInstanceOf(Date);
      expect(job.startedAt).toBeNull();
      expect(job.completedAt).toBeNull();
      expect(job.lastError).toBeNull();
    });

    it('uses default maxAttempts of 3 when not specified', () => {
      const job = makeJob();
      expect(job.maxAttempts).toBe(3);
    });

    it('uses provided maxAttempts when specified', () => {
      const job = makeJob({ maxAttempts: 5 });
      expect(job.maxAttempts).toBe(5);
    });
  });

  describe('withStarted', () => {
    it('sets status=Running and startedAt', () => {
      const job = makeJob();
      const started = job.withStarted();
      expect(started.status).toBe(JobStatus.Running);
      expect(started.startedAt).toBeInstanceOf(Date);
      expect(job.status).toBe(JobStatus.Pending);
    });
  });

  describe('withCompleted', () => {
    it('sets status=Completed and completedAt', () => {
      const job = makeJob().withStarted();
      const completed = job.withCompleted();
      expect(completed.status).toBe(JobStatus.Completed);
      expect(completed.completedAt).toBeInstanceOf(Date);
    });
  });

  describe('withFailed', () => {
    it('increments attempts, sets lastError, status=Failed', () => {
      const job = makeJob();
      const failed = job.withFailed('Connection timeout');
      expect(failed.status).toBe(JobStatus.Failed);
      expect(failed.attempts).toBe(1);
      expect(failed.lastError).toBe('Connection timeout');
      expect(job.attempts).toBe(0);
    });

    it('increments attempts on each failure', () => {
      const job = makeJob();
      const failed1 = job.withFailed('Error 1');
      const failed2 = failed1.withFailed('Error 2');
      expect(failed2.attempts).toBe(2);
      expect(failed2.lastError).toBe('Error 2');
    });
  });

  describe('withStatus', () => {
    it('returns new job with updated status', () => {
      const job = makeJob();
      const updated = job.withStatus(JobStatus.Cancelled);
      expect(updated.status).toBe(JobStatus.Cancelled);
      expect(job.status).toBe(JobStatus.Pending);
    });
  });

  describe('reconstitute', () => {
    it('restores all fields including non-null timestamps', () => {
      const now = new Date('2025-01-01');
      const job = ProcessingJob.reconstitute({
        id: 'job-123',
        assetId: 'asset-1',
        channelId: 'channel-1',
        type: ProcessingJobType.Validation,
        status: JobStatus.Completed,
        attempts: 2,
        maxAttempts: 3,
        lastError: 'prior error',
        scheduledAt: now,
        startedAt: now,
        completedAt: now,
      });
      expect(job.id).toBe('job-123');
      expect(job.startedAt).not.toBeNull();
      expect(job.completedAt).not.toBeNull();
      expect(job.lastError).toBe('prior error');
    });
  });

  describe('chained status transitions', () => {
    it('withCompleted followed by withStatus invokes toProps with non-null completedAt', () => {
      const job = makeJob().withStarted().withCompleted();
      // withStatus calls toProps() internally; completedAt is non-null
      const cancelled = job.withStatus(JobStatus.Cancelled);
      expect(cancelled.completedAt).not.toBeNull();
      expect(cancelled.status).toBe(JobStatus.Cancelled);
    });
  });

  describe('isTerminal', () => {
    it.each([JobStatus.Completed, JobStatus.Failed, JobStatus.Cancelled])(
      'returns true for %s',
      (status) => {
        const job = makeJob().withStatus(status);
        expect(job.isTerminal()).toBe(true);
      },
    );

    it.each([JobStatus.Pending, JobStatus.Running])(
      'returns false for %s',
      (status) => {
        const job = makeJob().withStatus(status);
        expect(job.isTerminal()).toBe(false);
      },
    );
  });
});
