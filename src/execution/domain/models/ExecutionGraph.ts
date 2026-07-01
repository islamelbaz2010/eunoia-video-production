import { randomUUID } from 'crypto';
import type { ExecutionNode } from './ExecutionNode';
import type { ExecutionEdge } from './ExecutionEdge';
import { ExecutionStatus } from './ExecutionStatus';

export interface ExecutionGraphProps {
  id: string;
  planId: string;
  nodes: ExecutionNode[];
  edges: ExecutionEdge[];
  createdAt: Date;
}

export type CreateExecutionGraphProps = Omit<ExecutionGraphProps, 'id' | 'createdAt'>;

export class ExecutionGraph {
  readonly id: string;
  readonly planId: string;
  readonly nodes: ReadonlyArray<ExecutionNode>;
  readonly edges: ReadonlyArray<ExecutionEdge>;
  readonly createdAt: Date;

  private constructor(props: ExecutionGraphProps) {
    this.id = props.id;
    this.planId = props.planId;
    this.nodes = Object.freeze([...props.nodes]);
    this.edges = Object.freeze([...props.edges]);
    this.createdAt = new Date(props.createdAt);
  }

  static create(props: CreateExecutionGraphProps): ExecutionGraph {
    return new ExecutionGraph({
      ...props,
      id: randomUUID(),
      createdAt: new Date(),
    });
  }

  static reconstitute(props: ExecutionGraphProps): ExecutionGraph {
    return new ExecutionGraph(props);
  }

  withUpdatedNode(updatedNode: ExecutionNode): ExecutionGraph {
    return ExecutionGraph.reconstitute({
      id: this.id,
      planId: this.planId,
      nodes: this.nodes.map(n => (n.id === updatedNode.id ? updatedNode : n)),
      edges: [...this.edges],
      createdAt: new Date(this.createdAt),
    });
  }

  getNode(nodeId: string): ExecutionNode | undefined {
    return this.nodes.find(n => n.id === nodeId);
  }

  getSuccessorIds(nodeId: string): string[] {
    return this.edges.filter(e => e.fromNodeId === nodeId).map(e => e.toNodeId);
  }

  getPredecessorIds(nodeId: string): string[] {
    return this.edges.filter(e => e.toNodeId === nodeId).map(e => e.fromNodeId);
  }

  getSuccessors(nodeId: string): ExecutionNode[] {
    const ids = this.getSuccessorIds(nodeId);
    return this.nodes.filter(n => ids.includes(n.id));
  }

  getPredecessors(nodeId: string): ExecutionNode[] {
    const ids = this.getPredecessorIds(nodeId);
    return this.nodes.filter(n => ids.includes(n.id));
  }

  isComplete(): boolean {
    return this.nodes.every(n => n.isTerminal());
  }

  hasFailed(): boolean {
    return this.nodes.some(n => n.status === ExecutionStatus.Failed);
  }

  succeededNodeCount(): number {
    return this.nodes.filter(n => n.status === ExecutionStatus.Succeeded).length;
  }

  failedNodeCount(): number {
    return this.nodes.filter(n => n.status === ExecutionStatus.Failed).length;
  }
}
