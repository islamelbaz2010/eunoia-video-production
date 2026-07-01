import { randomUUID } from 'crypto';
import type { ExecutionStatus } from './ExecutionStatus';
import type { ExecutionArtifact } from './ExecutionArtifact';

export interface ExecutionCheckpointProps {
  id: string;
  planId: string;
  nodeStatuses: Record<string, ExecutionStatus>;
  artifacts: ExecutionArtifact[];
  createdAt: Date;
}

export type CreateExecutionCheckpointProps = Omit<ExecutionCheckpointProps, 'id' | 'createdAt'>;

export class ExecutionCheckpoint {
  readonly id: string;
  readonly planId: string;
  readonly nodeStatuses: Readonly<Record<string, ExecutionStatus>>;
  readonly artifacts: ReadonlyArray<ExecutionArtifact>;
  readonly createdAt: Date;

  private constructor(props: ExecutionCheckpointProps) {
    this.id = props.id;
    this.planId = props.planId;
    this.nodeStatuses = Object.freeze({ ...props.nodeStatuses });
    this.artifacts = Object.freeze([...props.artifacts]);
    this.createdAt = new Date(props.createdAt);
  }

  static create(props: CreateExecutionCheckpointProps): ExecutionCheckpoint {
    return new ExecutionCheckpoint({
      ...props,
      id: randomUUID(),
      createdAt: new Date(),
    });
  }

  static reconstitute(props: ExecutionCheckpointProps): ExecutionCheckpoint {
    return new ExecutionCheckpoint(props);
  }

  getNodeStatus(nodeId: string): ExecutionStatus | undefined {
    return this.nodeStatuses[nodeId];
  }

  completedNodeCount(): number {
    return Object.keys(this.nodeStatuses).length;
  }
}
