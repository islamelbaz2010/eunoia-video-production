import { ExecutionStatus } from './ExecutionStatus';

export interface ExecutionResultProps {
  nodeId: string;
  status: ExecutionStatus;
  output: Record<string, unknown>;
  durationMs: number;
  error: string | null;
  completedAt: Date;
}

export class ExecutionResult {
  readonly nodeId: string;
  readonly status: ExecutionStatus;
  readonly output: Readonly<Record<string, unknown>>;
  readonly durationMs: number;
  readonly error: string | null;
  readonly completedAt: Date;

  private constructor(props: ExecutionResultProps) {
    this.nodeId = props.nodeId;
    this.status = props.status;
    this.output = Object.freeze({ ...props.output });
    this.durationMs = props.durationMs;
    this.error = props.error;
    this.completedAt = new Date(props.completedAt);
  }

  static create(props: ExecutionResultProps): ExecutionResult {
    return new ExecutionResult(props);
  }

  isSuccess(): boolean {
    return this.status === ExecutionStatus.Succeeded;
  }

  isFailure(): boolean {
    return this.status === ExecutionStatus.Failed;
  }
}
