import pino, { Logger as PinoInstance, LoggerOptions } from 'pino';
import type { ILogger } from './ILogger';

export class PinoLogger implements ILogger {
  private constructor(private readonly instance: PinoInstance) {}

  static create(options?: LoggerOptions): PinoLogger {
    return new PinoLogger(
      pino({
        level: options?.level ?? 'info',
        ...options,
      }),
    );
  }

  debug(objOrMsg: object | string, msg?: string): void {
    if (typeof objOrMsg === 'string') {
      this.instance.debug(objOrMsg);
    } else {
      this.instance.debug(objOrMsg, msg ?? '');
    }
  }

  info(objOrMsg: object | string, msg?: string): void {
    if (typeof objOrMsg === 'string') {
      this.instance.info(objOrMsg);
    } else {
      this.instance.info(objOrMsg, msg ?? '');
    }
  }

  warn(objOrMsg: object | string, msg?: string): void {
    if (typeof objOrMsg === 'string') {
      this.instance.warn(objOrMsg);
    } else {
      this.instance.warn(objOrMsg, msg ?? '');
    }
  }

  error(objOrMsg: object | string, msg?: string): void {
    if (typeof objOrMsg === 'string') {
      this.instance.error(objOrMsg);
    } else {
      this.instance.error(objOrMsg, msg ?? '');
    }
  }

  child(bindings: Record<string, unknown>): ILogger {
    return new PinoLogger(this.instance.child(bindings));
  }
}
