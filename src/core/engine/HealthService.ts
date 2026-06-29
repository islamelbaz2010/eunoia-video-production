import type { ILogger } from '../../shared/logger/ILogger';
import type { ISchedulerService } from '../scheduler/ISchedulerService';
import type { IStorageProvider } from '../storage/IStorageProvider';

export type CheckStatus = 'pass' | 'fail' | 'warn';
export type OverallStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface CheckResult {
  status: CheckStatus;
  message: string;
  durationMs: number;
}

export interface HealthStatus {
  status: OverallStatus;
  checks: Record<string, CheckResult>;
  checkedAt: Date;
}

export interface HealthServiceDependencies {
  supabaseUrl?: string;
  storageProviders: IStorageProvider[];
  queues: Array<{ getQueueLength(): number }>;
  schedulers: ISchedulerService[];
  aiProviders?: Array<{ name: string; isAvailable(): boolean }>;
}

export class HealthService {
  constructor(
    private readonly deps: HealthServiceDependencies,
    private readonly logger: ILogger,
  ) {}

  async check(): Promise<HealthStatus> {
    const [database, storage, queue, scheduler, providers] = await Promise.all([
      this.checkDatabase(),
      this.checkStorage(),
      this.checkQueue(),
      this.checkScheduler(),
      this.checkProviders(),
    ]);

    const checks: Record<string, CheckResult> = {
      database,
      storage,
      queue,
      scheduler,
      providers,
    };

    const status = this.computeOverallStatus(Object.values(checks));
    this.logger.debug({ status }, 'Health check complete');

    return { status, checks, checkedAt: new Date() };
  }

  async checkDatabase(): Promise<CheckResult> {
    const start = Date.now();

    if (this.deps.supabaseUrl === undefined || this.deps.supabaseUrl.length === 0) {
      return {
        status: 'warn',
        message: 'No Supabase URL configured',
        durationMs: Date.now() - start,
      };
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${this.deps.supabaseUrl}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (response.ok) {
        return { status: 'pass', message: 'Database reachable', durationMs: Date.now() - start };
      }
      return {
        status: 'fail',
        message: `Database returned status ${response.status}`,
        durationMs: Date.now() - start,
      };
    } catch {
      return {
        status: 'fail',
        message: 'Database unreachable',
        durationMs: Date.now() - start,
      };
    }
  }

  async checkStorage(): Promise<CheckResult> {
    const start = Date.now();

    if (this.deps.storageProviders.length === 0) {
      return { status: 'warn', message: 'No storage providers registered', durationMs: Date.now() - start };
    }

    const results = await Promise.allSettled(
      this.deps.storageProviders.map(p => p.exists('__health_check__')),
    );

    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      return {
        status: 'warn',
        message: `${failures.length} of ${results.length} storage providers had errors`,
        durationMs: Date.now() - start,
      };
    }

    return {
      status: 'pass',
      message: `${this.deps.storageProviders.length} storage provider(s) healthy`,
      durationMs: Date.now() - start,
    };
  }

  checkQueue(): Promise<CheckResult> {
    const start = Date.now();
    const totalLength = this.deps.queues.reduce((sum, q) => sum + q.getQueueLength(), 0);

    return Promise.resolve({
      status: 'pass',
      message: `Queue length: ${totalLength}`,
      durationMs: Date.now() - start,
    });
  }

  checkScheduler(): Promise<CheckResult> {
    const start = Date.now();
    const allTasks = this.deps.schedulers.flatMap(s => s.getTasks());
    const enabled = allTasks.filter(t => t.enabled).length;

    return Promise.resolve({
      status: 'pass',
      message: `${enabled}/${allTasks.length} tasks enabled`,
      durationMs: Date.now() - start,
    });
  }

  checkProviders(): Promise<CheckResult> {
    const start = Date.now();
    const aiProviders = this.deps.aiProviders ?? [];
    const names = aiProviders.map(p => p.name).join(', ');

    return Promise.resolve({
      status: 'pass',
      message: `AI Providers: ${names || 'none'}`,
      durationMs: Date.now() - start,
    });
  }

  private computeOverallStatus(results: CheckResult[]): OverallStatus {
    if (results.some(r => r.status === 'fail')) return 'unhealthy';
    if (results.some(r => r.status === 'warn')) return 'degraded';
    return 'healthy';
  }
}
