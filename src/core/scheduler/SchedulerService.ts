import { randomUUID } from 'crypto';
import type { ILogger } from '../../shared/logger/ILogger';
import type { ISchedulerService, ScheduledTask } from './ISchedulerService';

interface MutableTask {
  id: string;
  name: string;
  type: 'cron' | 'interval';
  expression: string;
  handler: () => Promise<void> | void;
  enabled: boolean;
  lastRunAt: Date | null;
  nextRunAt: Date | null;
}

interface TaskEntry {
  task: MutableTask;
  timer: ReturnType<typeof setInterval> | ReturnType<typeof setTimeout> | null;
}

export class SchedulerService implements ISchedulerService {
  private readonly entries = new Map<string, TaskEntry>();

  constructor(private readonly logger: ILogger) {}

  schedule(
    name: string,
    expression: string,
    type: 'cron' | 'interval',
    handler: () => Promise<void> | void,
  ): string {
    const id = randomUUID();
    const task: MutableTask = {
      id,
      name,
      type,
      expression,
      handler,
      enabled: true,
      lastRunAt: null,
      nextRunAt: this.computeNextRunAt(type, expression),
    };

    const entry: TaskEntry = { task, timer: null };
    this.entries.set(id, entry);
    this.startTimer(entry);

    this.logger.info({ taskId: id, name, type, expression }, 'Task scheduled');
    return id;
  }

  unschedule(taskId: string): void {
    const entry = this.entries.get(taskId);
    if (entry === undefined) return;

    this.clearTimer(entry);
    this.entries.delete(taskId);
    this.logger.info({ taskId }, 'Task unscheduled');
  }

  pause(taskId: string): void {
    const entry = this.entries.get(taskId);
    if (entry === undefined) return;

    this.clearTimer(entry);
    entry.task.enabled = false;
    this.logger.info({ taskId }, 'Task paused');
  }

  resume(taskId: string): void {
    const entry = this.entries.get(taskId);
    if (entry === undefined) return;

    entry.task.enabled = true;
    entry.task.nextRunAt = this.computeNextRunAt(entry.task.type, entry.task.expression);
    this.startTimer(entry);
    this.logger.info({ taskId }, 'Task resumed');
  }

  async runNow(taskId: string): Promise<void> {
    const entry = this.entries.get(taskId);
    if (entry === undefined) return;

    await this.executeTask(entry.task);
  }

  async shutdown(): Promise<void> {
    for (const entry of this.entries.values()) {
      this.clearTimer(entry);
    }
    this.entries.clear();
    this.logger.info('Scheduler shut down');
  }

  getTasks(): ReadonlyArray<ScheduledTask> {
    return [...this.entries.values()].map(e => e.task as ScheduledTask);
  }

  private startTimer(entry: TaskEntry): void {
    const { task } = entry;
    if (!task.enabled) return;

    if (task.type === 'interval') {
      const ms = parseInt(task.expression, 10);
      const timer = setInterval(() => void this.executeTask(task), ms);
      timer.unref();
      entry.timer = timer;
    } else {
      this.scheduleCronTick(entry);
    }
  }

  private scheduleCronTick(entry: TaskEntry): void {
    const { task } = entry;
    const next = nextCronDate(task.expression, new Date());
    task.nextRunAt = next;
    const delay = next.getTime() - Date.now();

    const timer = setTimeout(() => {
      void this.executeTask(task).then(() => {
        if (task.enabled) {
          this.scheduleCronTick(entry);
        }
      });
    }, Math.max(0, delay));
    timer.unref();
    entry.timer = timer;
  }

  private async executeTask(task: MutableTask): Promise<void> {
    try {
      await task.handler();
      task.lastRunAt = new Date();
      this.logger.debug({ taskId: task.id, name: task.name }, 'Task executed');
    } catch (error) {
      this.logger.error({ taskId: task.id, name: task.name, error }, 'Task execution failed');
    }
  }

  private clearTimer(entry: TaskEntry): void {
    if (entry.timer !== null) {
      clearInterval(entry.timer as ReturnType<typeof setInterval>);
      clearTimeout(entry.timer as ReturnType<typeof setTimeout>);
      entry.timer = null;
    }
  }

  private computeNextRunAt(type: 'cron' | 'interval', expression: string): Date {
    if (type === 'interval') {
      const ms = parseInt(expression, 10);
      return new Date(Date.now() + ms);
    }
    return nextCronDate(expression, new Date());
  }
}

export function nextCronDate(expression: string, from: Date): Date {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) {
    throw new Error(`Invalid cron expression: ${expression}`);
  }

  const [minExpr, hourExpr, domExpr, monthExpr, dowExpr] = parts as [
    string,
    string,
    string,
    string,
    string,
  ];

  const candidate = new Date(from);
  candidate.setUTCSeconds(0, 0);
  candidate.setUTCMinutes(candidate.getUTCMinutes() + 1);

  for (let i = 0; i < 366 * 24 * 60; i++) {
    if (
      matchField(monthExpr, candidate.getUTCMonth() + 1, 1, 12) &&
      matchField(domExpr, candidate.getUTCDate(), 1, 31) &&
      matchField(dowExpr, candidate.getUTCDay(), 0, 6) &&
      matchField(hourExpr, candidate.getUTCHours(), 0, 23) &&
      matchField(minExpr, candidate.getUTCMinutes(), 0, 59)
    ) {
      return candidate;
    }
    candidate.setUTCMinutes(candidate.getUTCMinutes() + 1);
  }

  throw new Error(`Cannot find next run for cron expression: ${expression}`);
}

function matchField(expr: string, value: number, _min: number, _max: number): boolean {
  if (expr === '*') return true;
  const parsed = parseInt(expr, 10);
  if (isNaN(parsed)) return false;
  return parsed === value;
}
