export interface ILogger {
  debug(obj: object, msg: string): void;
  debug(msg: string): void;
  info(obj: object, msg: string): void;
  info(msg: string): void;
  warn(obj: object, msg: string): void;
  warn(msg: string): void;
  error(obj: object, msg: string): void;
  error(msg: string): void;
  child(bindings: Record<string, unknown>): ILogger;
}
