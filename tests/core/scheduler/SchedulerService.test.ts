import { SchedulerService, nextCronDate } from '../../../src/core/scheduler/SchedulerService';
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

describe('SchedulerService', () => {
  let logger: jest.Mocked<ILogger>;
  let scheduler: SchedulerService;

  beforeEach(() => {
    jest.useFakeTimers();
    logger = makeLogger();
    scheduler = new SchedulerService(logger);
  });

  afterEach(async () => {
    await scheduler.shutdown();
    jest.useRealTimers();
  });

  describe('schedule', () => {
    it('returns a task id', () => {
      const id = scheduler.schedule('test', '1000', 'interval', jest.fn());
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('registers the task in getTasks()', () => {
      scheduler.schedule('my-task', '1000', 'interval', jest.fn());
      const tasks = scheduler.getTasks();
      expect(tasks).toHaveLength(1);
      expect(tasks[0]!.name).toBe('my-task');
    });

    it('sets task as enabled by default', () => {
      scheduler.schedule('enabled-task', '1000', 'interval', jest.fn());
      expect(scheduler.getTasks()[0]!.enabled).toBe(true);
    });
  });

  describe('unschedule', () => {
    it('removes the task from getTasks()', () => {
      const id = scheduler.schedule('task', '1000', 'interval', jest.fn());
      scheduler.unschedule(id);
      expect(scheduler.getTasks()).toHaveLength(0);
    });

    it('does nothing for unknown taskId', () => {
      expect(() => scheduler.unschedule('unknown')).not.toThrow();
    });
  });

  describe('pause', () => {
    it('sets task enabled to false', () => {
      const id = scheduler.schedule('task', '1000', 'interval', jest.fn());
      scheduler.pause(id);
      expect(scheduler.getTasks()[0]!.enabled).toBe(false);
    });

    it('does nothing for unknown taskId', () => {
      expect(() => scheduler.pause('unknown')).not.toThrow();
    });
  });

  describe('resume', () => {
    it('re-enables a paused task', () => {
      const id = scheduler.schedule('task', '1000', 'interval', jest.fn());
      scheduler.pause(id);
      scheduler.resume(id);
      expect(scheduler.getTasks()[0]!.enabled).toBe(true);
    });
  });

  describe('runNow', () => {
    it('calls the handler immediately', async () => {
      const handler = jest.fn().mockResolvedValue(undefined);
      const id = scheduler.schedule('task', '60000', 'interval', handler);

      await scheduler.runNow(id);

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('does nothing for unknown taskId', async () => {
      await expect(scheduler.runNow('unknown')).resolves.toBeUndefined();
    });
  });

  describe('interval tasks', () => {
    it('fires handler at each interval', () => {
      const handler = jest.fn();
      scheduler.schedule('repeating', '1000', 'interval', handler);

      jest.advanceTimersByTime(3000);
      expect(handler).toHaveBeenCalledTimes(3);
    });
  });

  describe('shutdown', () => {
    it('clears all timers and removes tasks', async () => {
      const handler = jest.fn();
      scheduler.schedule('task', '1000', 'interval', handler);
      await scheduler.shutdown();

      jest.advanceTimersByTime(5000);
      expect(handler).not.toHaveBeenCalled();
      expect(scheduler.getTasks()).toHaveLength(0);
    });
  });
});

describe('nextCronDate', () => {
  it('finds the next matching minute', () => {
    const from = new Date('2025-01-15T10:30:00Z');
    const next = nextCronDate('31 10 * * *', from);
    expect(next.getUTCHours()).toBe(10);
    expect(next.getUTCMinutes()).toBe(31);
  });

  it('advances to the next hour if minute already passed', () => {
    const from = new Date('2025-01-15T10:45:00Z');
    const next = nextCronDate('30 11 * * *', from);
    expect(next.getUTCHours()).toBe(11);
    expect(next.getUTCMinutes()).toBe(30);
  });

  it('throws on invalid expression', () => {
    expect(() => nextCronDate('* *', new Date())).toThrow();
  });
});
