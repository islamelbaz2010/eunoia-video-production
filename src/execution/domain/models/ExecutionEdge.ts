export type EdgeCondition = 'always' | 'on_success' | 'on_failure';

export interface ExecutionEdgeProps {
  fromNodeId: string;
  toNodeId: string;
  condition: EdgeCondition;
}

export class ExecutionEdge {
  readonly fromNodeId: string;
  readonly toNodeId: string;
  readonly condition: EdgeCondition;

  private constructor(props: ExecutionEdgeProps) {
    this.fromNodeId = props.fromNodeId;
    this.toNodeId = props.toNodeId;
    this.condition = props.condition;
  }

  static create(props: ExecutionEdgeProps): ExecutionEdge {
    return new ExecutionEdge(props);
  }

  static reconstitute(props: ExecutionEdgeProps): ExecutionEdge {
    return new ExecutionEdge(props);
  }

  isConditional(): boolean {
    return this.condition !== 'always';
  }
}
