import { Engine } from '../../../src/core/engine/Engine';
import type { AppConfig } from '../../../src/core/config/AppConfig';
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

function makeConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    supabaseUrl: 'https://abc.supabase.co',
    supabaseServiceRoleKey: 'key',
    openAiApiKey: 'sk-openai',
    googleDriveFolder: 'folder-id',
    n8nBaseUrl: 'https://n8n.example.com',
    logLevel: 'info',
    nodeEnv: 'test',
    ...overrides,
  };
}

function makeStorageProvider(name = 'test'): jest.Mocked<IStorageProvider> {
  return {
    name,
    upload: jest.fn(),
    download: jest.fn(),
    delete: jest.fn(),
    exists: jest.fn().mockResolvedValue(true),
    list: jest.fn(),
  };
}

function makeScheduler(): jest.Mocked<ISchedulerService> {
  return {
    schedule: jest.fn(),
    unschedule: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    runNow: jest.fn(),
    shutdown: jest.fn().mockResolvedValue(undefined),
    getTasks: jest.fn().mockReturnValue([]),
  };
}

describe('Engine', () => {
  let logger: jest.Mocked<ILogger>;
  let engine: Engine;

  beforeEach(() => {
    logger = makeLogger();
    engine = new Engine(makeConfig(), logger);
  });

  describe('isRunning', () => {
    it('returns false before start()', () => {
      expect(engine.isRunning()).toBe(false);
    });

    it('returns true after start()', async () => {
      await engine.start();
      expect(engine.isRunning()).toBe(true);
    });

    it('returns false after stop()', async () => {
      await engine.start();
      await engine.stop();
      expect(engine.isRunning()).toBe(false);
    });
  });

  describe('registerStorageProvider', () => {
    it('stores the provider (visible in health check)', async () => {
      const provider = makeStorageProvider('my-storage');
      engine.registerStorageProvider(provider);

      const health = await engine.getHealth();
      expect(health.checks['providers']!.message).toContain('my-storage');
    });
  });

  describe('registerScheduler', () => {
    it('stores the scheduler', async () => {
      const scheduler = makeScheduler();
      engine.registerScheduler(scheduler);

      const health = await engine.getHealth();
      expect(health.checks['scheduler']).toBeDefined();
    });
  });

  describe('stop', () => {
    it('calls shutdown on all registered schedulers', async () => {
      const schedulerA = makeScheduler();
      const schedulerB = makeScheduler();
      engine.registerScheduler(schedulerA);
      engine.registerScheduler(schedulerB);

      await engine.start();
      await engine.stop();

      expect(schedulerA.shutdown).toHaveBeenCalled();
      expect(schedulerB.shutdown).toHaveBeenCalled();
    });
  });

  describe('getHealth', () => {
    it('returns a HealthStatus object', async () => {
      const health = await engine.getHealth();
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('checks');
      expect(health).toHaveProperty('checkedAt');
    });
  });
});
