import { JobQueue } from '../../../src/core/queue/JobQueue';
import { JobStatus } from '../../../src/core/queue/types';
import type { ILogger } from '../../../src/shared/logger/ILogger';

function makeLogger(): jest.Mocked<ILogger> {
  return {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: jest.fn().mockReturnThis(),
  } as unknown as jest.Mocked<ILogger>;
}

function makeQueue(maxAttempts = 3, backoffMs = 100): JobQueue<string> {
  return new JobQueue<string>(
    { defaultRetryPolicy: { maxAttempts, backoffMs } },
    makeLogger(),
  );
}

describe('JobQueue', () => {
  describe('enqueue', () => {
    it('returns a job with Pending status', () => {
      const queue = makeQueue();
      const job = queue.enqueue('send-email', 'payload');
      expect(job.status).toBe(JobStatus.Pending);
    });

    it('assigns provided priority', () => {
      const queue = makeQueue();
      const job = queue.enqueue('task', 'p', { priority: 10 });
      expect(job.priority).toBe(10);
    });

    it('defaults priority to 0', () => {
      const queue = makeQueue();
      const job = queue.enqueue('task', 'p');
      expect(job.priority).toBe(0);
    });

    it('assigns a runAt in the future for delayed jobs', () => {
      const queue = makeQueue();
      const runAt = new Date(Date.now() + 60_000);
      const job = queue.enqueue('task', 'p', { runAt });
      expect(job.runAt.getTime()).toBe(runAt.getTime());
    });
  });

  describe('dequeue', () => {
    it('returns undefined when empty', () => {
      const queue = makeQueue();
      expect(queue.dequeue()).toBeUndefined();
    });

    it('returns the enqueued job', () => {
      const queue = makeQueue();
      queue.enqueue('task', 'p');
      const job = queue.dequeue();
      expect(job).toBeDefined();
      expect(job!.status).toBe(JobStatus.Running);
    });

    it('returns the highest-priority job first', () => {
      const queue = makeQueue();
      queue.enqueue('low', 'low', { priority: 1 });
      queue.enqueue('high', 'high', { priority: 10 });
      queue.enqueue('mid', 'mid', { priority: 5 });

      const first = queue.dequeue();
      expect(first!.type).toBe('high');

      const second = queue.dequeue();
      expect(second!.type).toBe('mid');
    });

    it('skips jobs with runAt in the future', () => {
      const queue = makeQueue();
      queue.enqueue('future', 'p', { runAt: new Date(Date.now() + 60_000) });
      expect(queue.dequeue()).toBeUndefined();
    });

    it('returns only ready jobs when mixed', () => {
      const queue = makeQueue();
      queue.enqueue('future', 'p', { runAt: new Date(Date.now() + 60_000) });
      queue.enqueue('ready', 'r');

      const job = queue.dequeue();
      expect(job!.type).toBe('ready');
    });

    it('increments attempts on dequeue', () => {
      const queue = makeQueue();
      queue.enqueue('task', 'p');
      const job = queue.dequeue();
      expect(job!.attempts).toBe(1);
    });
  });

  describe('acknowledge', () => {
    it('marks job as Completed', () => {
      const queue = makeQueue();
      queue.enqueue('task', 'p');
      const running = queue.dequeue()!;
      queue.acknowledge(running.id);

      const job = queue.getJob(running.id);
      expect(job!.status).toBe(JobStatus.Completed);
      expect(job!.completedAt).toBeInstanceOf(Date);
    });

    it('does nothing for unknown jobId', () => {
      const queue = makeQueue();
      expect(() => queue.acknowledge('unknown')).not.toThrow();
    });
  });

  describe('fail', () => {
    it('re-schedules with Pending status when attempts < maxAttempts', () => {
      const queue = makeQueue(3, 100);
      queue.enqueue('task', 'p');
      const running = queue.dequeue()!;
      queue.fail(running.id, 'timeout');

      const job = queue.getJob(running.id);
      expect(job!.status).toBe(JobStatus.Pending);
      expect(job!.runAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('moves to DLQ and marks Failed when maxAttempts exceeded', () => {
      const queue = makeQueue(1, 100);
      queue.enqueue('task', 'p');
      const running = queue.dequeue()!;
      queue.fail(running.id, 'fatal error');

      const job = queue.getJob(running.id);
      expect(job!.status).toBe(JobStatus.Failed);

      const dlq = queue.getDeadLetterQueue();
      expect(dlq).toHaveLength(1);
      expect(dlq[0]!.lastError).toBe('fatal error');
    });

    it('does nothing for unknown jobId', () => {
      const queue = makeQueue();
      expect(() => queue.fail('unknown', 'error')).not.toThrow();
    });
  });

  describe('cancel', () => {
    it('marks job as Cancelled', () => {
      const queue = makeQueue();
      const job = queue.enqueue('task', 'p');
      queue.cancel(job.id);

      expect(queue.getJob(job.id)!.status).toBe(JobStatus.Cancelled);
    });

    it('does nothing for unknown jobId', () => {
      const queue = makeQueue();
      expect(() => queue.cancel('unknown')).not.toThrow();
    });
  });

  describe('getDeadLetterQueue', () => {
    it('returns failed jobs after exhausting retries', () => {
      const queue = makeQueue(1, 0);
      queue.enqueue('task', 'p');
      const job = queue.dequeue()!;
      queue.fail(job.id, 'error');

      expect(queue.getDeadLetterQueue()).toHaveLength(1);
    });

    it('returns empty array initially', () => {
      const queue = makeQueue();
      expect(queue.getDeadLetterQueue()).toHaveLength(0);
    });
  });

  describe('getPendingCount', () => {
    it('returns the number of pending jobs', () => {
      const queue = makeQueue();
      queue.enqueue('a', 'p');
      queue.enqueue('b', 'p');
      expect(queue.getPendingCount()).toBe(2);
    });

    it('decreases after dequeue', () => {
      const queue = makeQueue();
      queue.enqueue('a', 'p');
      queue.dequeue();
      expect(queue.getPendingCount()).toBe(0);
    });
  });

  describe('getRunningCount', () => {
    it('increases after dequeue', () => {
      const queue = makeQueue();
      queue.enqueue('a', 'p');
      queue.dequeue();
      expect(queue.getRunningCount()).toBe(1);
    });

    it('decreases after acknowledge', () => {
      const queue = makeQueue();
      queue.enqueue('a', 'p');
      const job = queue.dequeue()!;
      queue.acknowledge(job.id);
      expect(queue.getRunningCount()).toBe(0);
    });
  });

  describe('getQueueLength', () => {
    it('sums pending and running counts', () => {
      const queue = makeQueue();
      queue.enqueue('a', 'p');
      queue.enqueue('b', 'p');
      queue.dequeue();
      // 1 pending + 1 running = 2
      expect(queue.getQueueLength()).toBe(2);
    });
  });
});
