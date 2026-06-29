export interface ScheduledTask {
  readonly id: string;
  readonly name: string;
  readonly type: 'cron' | 'interval';
  readonly expression: string;
  readonly handler: () => Promise<void> | void;
  readonly enabled: boolean;
  readonly lastRunAt: Date | null;
  readonly nextRunAt: Date | null;
}

export interface ISchedulerService {
  schedule(
    name: string,
    expression: string,
    type: 'cron' | 'interval',
    handler: () => Promise<void> | void,
  ): string;
  unschedule(taskId: string): void;
  pause(taskId: string): void;
  resume(taskId: string): void;
  runNow(taskId: string): Promise<void>;
  shutdown(): Promise<void>;
  getTasks(): ReadonlyArray<ScheduledTask>;
}
