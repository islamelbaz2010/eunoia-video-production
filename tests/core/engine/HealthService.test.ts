import { HealthService } from '../../../src/core/engine/HealthService';
import type { ILogger } from '../../../src/shared/logger/ILogger';
import type { IStorageProvider } from '../../../src/core/storage/IStorageProvider';
import type { ISchedulerService } from '../../../src/core/scheduler/ISchedulerService';

function makeLogger(): jest.Mocked<ILogger> {
  return {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: jest.fn().mockReturnThis(),
  } as unknown as jest.Mocked<ILogger>;
}

function makeStorageProvider(existsResult: Promise<boolean> = Promise.resolve(true)): jest.Mocked<IStorageProvider> {
  return {
    name: 'test-provider',
    upload: jest.fn(),
    download: jest.fn(),
    delete: jest.fn(),
    exists: jest.fn().mockReturnValue(existsResult),
    list: jest.fn(),
  };
}

function makeScheduler(taskCount = 0): jest.Mocked<ISchedulerService> {
  const tasks = Array.from({ length: taskCount }, (_, i) => ({
    id: `task-${i}`,
    name: `task-${i}`,
    type: 'interval' as const,
    expression: '1000',
    handler: jest.fn(),
    enabled: true,
    lastRunAt: null,
    nextRunAt: null,
  }));

  return {
    schedule: jest.fn(),
    unschedule: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    runNow: jest.fn(),
    shutdown: jest.fn(),
    getTasks: jest.fn().mockReturnValue(tasks),
  };
}

describe('HealthService', () => {
  let logger: jest.Mocked<ILogger>;
  const originalFetch = global.fetch;

  beforeEach(() => {
    logger = makeLogger();
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 }) as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('check()', () => {
    it('returns healthy when all checks pass', async () => {
      const provider = makeStorageProvider();
      const service = new HealthService(
        { supabaseUrl: 'https://abc.supabase.co', storageProviders: [provider], queues: [], schedulers: [] },
        logger,
      );

      const result = await service.check();
      expect(result.status).toBe('healthy');
      expect(result.checkedAt).toBeInstanceOf(Date);
    });

    it('returns degraded when any check warns (no supabase URL)', async () => {
      const service = new HealthService(
        { storageProviders: [], queues: [], schedulers: [] },
        logger,
      );

      const result = await service.check();
      expect(result.status).toBe('degraded');
    });

    it('returns unhealthy when a storage provider check fails', async () => {
      const provider = makeStorageProvider(Promise.reject(new Error('storage down')));
      const service = new HealthService(
        { supabaseUrl: 'https://example.supabase.co', storageProviders: [provider], queues: [], schedulers: [] },
        logger,
      );

      const result = await service.check();
      expect(result.checks['storage']!.status).toBe('warn');
    });

    it('includes all check keys in the result', async () => {
      const service = new HealthService(
        { storageProviders: [], queues: [], schedulers: [] },
        logger,
      );

      const result = await service.check();
      expect(Object.keys(result.checks).sort()).toEqual(
        ['database', 'providers', 'queue', 'scheduler', 'storage'].sort(),
      );
    });
  });

  describe('checkStorage', () => {
    it('calls exists() on each provider', async () => {
      const providerA = makeStorageProvider();
      const providerB = makeStorageProvider();
      const service = new HealthService(
        { storageProviders: [providerA, providerB], queues: [], schedulers: [] },
        logger,
      );

      await service.checkStorage();

      expect(providerA.exists).toHaveBeenCalledWith('__health_check__');
      expect(providerB.exists).toHaveBeenCalledWith('__health_check__');
    });

    it('returns warn when no providers registered', async () => {
      const service = new HealthService(
        { storageProviders: [], queues: [], schedulers: [] },
        logger,
      );

      const result = await service.checkStorage();
      expect(result.status).toBe('warn');
    });
  });

  describe('checkQueue', () => {
    it('reports total queue length', async () => {
      const service = new HealthService(
        {
          storageProviders: [],
          queues: [{ getQueueLength: () => 5 }, { getQueueLength: () => 3 }],
          schedulers: [],
        },
        logger,
      );

      const result = await service.checkQueue();
      expect(result.status).toBe('pass');
      expect(result.message).toContain('8');
    });
  });

  describe('checkScheduler', () => {
    it('reports enabled/total task counts', async () => {
      const scheduler = makeScheduler(3);
      const service = new HealthService(
        { storageProviders: [], queues: [], schedulers: [scheduler] },
        logger,
      );

      const result = await service.checkScheduler();
      expect(result.status).toBe('pass');
      expect(result.message).toContain('3');
    });
  });
});
