import { randomUUID } from 'crypto';
import type { ExecutionGraph } from './ExecutionGraph';
import type { ExecutionContext } from './ExecutionContext';
import type { ExecutionCheckpoint } from './ExecutionCheckpoint';
import { ExecutionStatus } from './ExecutionStatus';

export interface ExecutionPlanProps {
  id: string;
  campaignId: string | null;
  ownerId: string;
  productionPlanId: string | null;
  graph: ExecutionGraph;
  context: ExecutionContext;
  status: ExecutionStatus;
  estimatedDurationMs: number;
  estimatedCost: number;
  startedAt: Date | null;
  completedAt: Date | null;
  checkpoints: ExecutionCheckpoint[];
  createdAt: Date;
  updatedAt: Date;
}

export type CreateExecutionPlanProps = Pick<
  ExecutionPlanProps,
  'campaignId' | 'ownerId' | 'productionPlanId' | 'graph' | 'context' | 'estimatedDurationMs' | 'estimatedCost'
>;

export class ExecutionPlan {
  readonly id: string;
  readonly campaignId: string | null;
  readonly ownerId: string;
  readonly productionPlanId: string | null;
  readonly graph: ExecutionGraph;
  readonly context: ExecutionContext;
  readonly status: ExecutionStatus;
  readonly estimatedDurationMs: number;
  readonly estimatedCost: number;
  readonly startedAt: Date | null;
  readonly completedAt: Date | null;
  readonly checkpoints: ReadonlyArray<ExecutionCheckpoint>;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: ExecutionPlanProps) {
    this.id = props.id;
    this.campaignId = props.campaignId;
    this.ownerId = props.ownerId;
    this.productionPlanId = props.productionPlanId;
    this.graph = props.graph;
    this.context = props.context;
    this.status = props.status;
    this.estimatedDurationMs = props.estimatedDurationMs;
    this.estimatedCost = props.estimatedCost;
    this.startedAt = props.startedAt !== null ? new Date(props.startedAt) : null;
    this.completedAt = props.completedAt !== null ? new Date(props.completedAt) : null;
    this.checkpoints = Object.freeze([...props.checkpoints]);
    this.createdAt = new Date(props.createdAt);
    this.updatedAt = new Date(props.updatedAt);
  }

  static create(props: CreateExecutionPlanProps): ExecutionPlan {
    const now = new Date();
    return new ExecutionPlan({
      ...props,
      id: randomUUID(),
      status: ExecutionStatus.Pending,
      startedAt: null,
      completedAt: null,
      checkpoints: [],
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: ExecutionPlanProps): ExecutionPlan {
    return new ExecutionPlan(props);
  }

  withStatus(status: ExecutionStatus): ExecutionPlan {
    return ExecutionPlan.reconstitute({ ...this.toProps(), status, updatedAt: new Date() });
  }

  withGraph(graph: ExecutionGraph): ExecutionPlan {
    return ExecutionPlan.reconstitute({ ...this.toProps(), graph, updatedAt: new Date() });
  }

  withContext(context: ExecutionContext): ExecutionPlan {
    return ExecutionPlan.reconstitute({ ...this.toProps(), context, updatedAt: new Date() });
  }

  withStartedAt(startedAt: Date): ExecutionPlan {
    return ExecutionPlan.reconstitute({
      ...this.toProps(),
      startedAt,
      status: ExecutionStatus.Running,
      updatedAt: new Date(),
    });
  }

  withCompletedAt(completedAt: Date, status: ExecutionStatus): ExecutionPlan {
    return ExecutionPlan.reconstitute({
      ...this.toProps(),
      completedAt,
      status,
      updatedAt: new Date(),
    });
  }

  withCheckpoint(checkpoint: ExecutionCheckpoint): ExecutionPlan {
    return ExecutionPlan.reconstitute({
      ...this.toProps(),
      checkpoints: [...this.checkpoints, checkpoint],
      updatedAt: new Date(),
    });
  }

  isTerminal(): boolean {
    return (
      this.status === ExecutionStatus.Succeeded ||
      this.status === ExecutionStatus.Failed ||
      this.status === ExecutionStatus.Cancelled
    );
  }

  latestCheckpoint(): ExecutionCheckpoint | null {
    const last = this.checkpoints[this.checkpoints.length - 1];
    return last ?? null;
  }

  private toProps(): ExecutionPlanProps {
    return {
      id: this.id,
      campaignId: this.campaignId,
      ownerId: this.ownerId,
      productionPlanId: this.productionPlanId,
      graph: this.graph,
      context: this.context,
      status: this.status,
      estimatedDurationMs: this.estimatedDurationMs,
      estimatedCost: this.estimatedCost,
      startedAt: this.startedAt !== null ? new Date(this.startedAt) : null,
      completedAt: this.completedAt !== null ? new Date(this.completedAt) : null,
      checkpoints: [...this.checkpoints],
      createdAt: new Date(this.createdAt),
      updatedAt: new Date(this.updatedAt),
    };
  }
}
