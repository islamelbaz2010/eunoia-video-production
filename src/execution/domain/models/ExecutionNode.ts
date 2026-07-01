import { randomUUID } from 'crypto';
import { ExecutionStatus, TERMINAL_STATUSES } from './ExecutionStatus';
import { NodeType } from './NodeType';
import type { ExecutionResult } from './ExecutionResult';

export interface ExecutionNodeProps {
  id: string;
  planId: string;
  type: NodeType;
  status: ExecutionStatus;
  priority: number;
  config: Record<string, unknown>;
  result: ExecutionResult | null;
  retryCount: number;
  maxRetries: number;
  estimatedDurationMs: number;
  estimatedCost: number;
  startedAt: Date | null;
  completedAt: Date | null;
  error: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateExecutionNodeProps = Pick<
  ExecutionNodeProps,
  'planId' | 'type' | 'priority' | 'config' | 'maxRetries' | 'estimatedDurationMs' | 'estimatedCost' | 'metadata'
>;

export class ExecutionNode {
  readonly id: string;
  readonly planId: string;
  readonly type: NodeType;
  readonly status: ExecutionStatus;
  readonly priority: number;
  readonly config: Readonly<Record<string, unknown>>;
  readonly result: ExecutionResult | null;
  readonly retryCount: number;
  readonly maxRetries: number;
  readonly estimatedDurationMs: number;
  readonly estimatedCost: number;
  readonly startedAt: Date | null;
  readonly completedAt: Date | null;
  readonly error: string | null;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: ExecutionNodeProps) {
    this.id = props.id;
    this.planId = props.planId;
    this.type = props.type;
    this.status = props.status;
    this.priority = props.priority;
    this.config = Object.freeze({ ...props.config });
    this.result = props.result;
    this.retryCount = props.retryCount;
    this.maxRetries = props.maxRetries;
    this.estimatedDurationMs = props.estimatedDurationMs;
    this.estimatedCost = props.estimatedCost;
    this.startedAt = props.startedAt !== null ? new Date(props.startedAt) : null;
    this.completedAt = props.completedAt !== null ? new Date(props.completedAt) : null;
    this.error = props.error;
    this.metadata = Object.freeze({ ...props.metadata });
    this.createdAt = new Date(props.createdAt);
    this.updatedAt = new Date(props.updatedAt);
  }

  static create(props: CreateExecutionNodeProps): ExecutionNode {
    const now = new Date();
    return new ExecutionNode({
      ...props,
      id: randomUUID(),
      status: ExecutionStatus.Pending,
      result: null,
      retryCount: 0,
      startedAt: null,
      completedAt: null,
      error: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: ExecutionNodeProps): ExecutionNode {
    return new ExecutionNode(props);
  }

  withStatus(status: ExecutionStatus): ExecutionNode {
    return ExecutionNode.reconstitute({ ...this.toProps(), status, updatedAt: new Date() });
  }

  withResult(result: ExecutionResult): ExecutionNode {
    return ExecutionNode.reconstitute({
      ...this.toProps(),
      result,
      status: result.status,
      completedAt: result.completedAt,
      error: result.error,
      updatedAt: new Date(),
    });
  }

  withStartedAt(startedAt: Date): ExecutionNode {
    return ExecutionNode.reconstitute({
      ...this.toProps(),
      startedAt,
      status: ExecutionStatus.Running,
      updatedAt: new Date(),
    });
  }

  withRetry(): ExecutionNode {
    return ExecutionNode.reconstitute({
      ...this.toProps(),
      retryCount: this.retryCount + 1,
      status: ExecutionStatus.Retrying,
      updatedAt: new Date(),
    });
  }

  isTerminal(): boolean {
    return TERMINAL_STATUSES.has(this.status);
  }

  canRetry(): boolean {
    return this.retryCount < this.maxRetries;
  }

  isReady(): boolean {
    return this.status === ExecutionStatus.Ready;
  }

  private toProps(): ExecutionNodeProps {
    return {
      id: this.id,
      planId: this.planId,
      type: this.type,
      status: this.status,
      priority: this.priority,
      config: { ...this.config },
      result: this.result,
      retryCount: this.retryCount,
      maxRetries: this.maxRetries,
      estimatedDurationMs: this.estimatedDurationMs,
      estimatedCost: this.estimatedCost,
      startedAt: this.startedAt !== null ? new Date(this.startedAt) : null,
      completedAt: this.completedAt !== null ? new Date(this.completedAt) : null,
      error: this.error,
      metadata: { ...this.metadata },
      createdAt: new Date(this.createdAt),
      updatedAt: new Date(this.updatedAt),
    };
  }
}
