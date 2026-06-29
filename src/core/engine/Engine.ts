import type { AppConfig } from '../config/AppConfig';
import type { ILogger } from '../../shared/logger/ILogger';
import type { ISchedulerService } from '../scheduler/ISchedulerService';
import type { IStorageProvider } from '../storage/IStorageProvider';
import type { JobQueue } from '../queue/JobQueue';
import { HealthService, type HealthStatus } from './HealthService';

export class Engine {
  private started = false;
  private readonly storageProviders = new Map<string, IStorageProvider>();
  private readonly schedulers: ISchedulerService[] = [];
  private readonly queues: Array<JobQueue> = [];

  constructor(
    private readonly config: AppConfig,
    private readonly logger: ILogger,
  ) {}

  async start(): Promise<void> {
    this.logger.info(
      { env: this.config.nodeEnv, logLevel: this.config.logLevel },
      'Engine starting',
    );
    this.started = true;
    this.logger.info('Engine started');
  }

  async stop(): Promise<void> {
    this.logger.info('Engine stopping');

    await Promise.all(this.schedulers.map(s => s.shutdown()));

    this.started = false;
    this.logger.info('Engine stopped');
  }

  registerStorageProvider(provider: IStorageProvider): void {
    this.storageProviders.set(provider.name, provider);
    this.logger.debug({ providerName: provider.name }, 'Storage provider registered');
  }

  registerScheduler(scheduler: ISchedulerService): void {
    this.schedulers.push(scheduler);
    this.logger.debug('Scheduler registered');
  }

  registerQueue(queue: JobQueue): void {
    this.queues.push(queue);
    this.logger.debug('Queue registered');
  }

  async getHealth(): Promise<HealthStatus> {
    const healthService = new HealthService(
      {
        supabaseUrl: this.config.supabaseUrl,
        storageProviders: [...this.storageProviders.values()],
        queues: this.queues,
        schedulers: this.schedulers,
      },
      this.logger,
    );
    return healthService.check();
  }

  isRunning(): boolean {
    return this.started;
  }
}
