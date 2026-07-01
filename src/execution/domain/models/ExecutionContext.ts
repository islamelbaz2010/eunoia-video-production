import type { ExecutionArtifact } from './ExecutionArtifact';

export interface ExecutionContextProps {
  planId: string;
  campaignId: string | null;
  ownerId: string;
  variables: Record<string, unknown>;
  artifacts: ExecutionArtifact[];
}

export class ExecutionContext {
  readonly planId: string;
  readonly campaignId: string | null;
  readonly ownerId: string;
  readonly variables: Readonly<Record<string, unknown>>;
  readonly artifacts: ReadonlyArray<ExecutionArtifact>;

  private constructor(props: ExecutionContextProps) {
    this.planId = props.planId;
    this.campaignId = props.campaignId;
    this.ownerId = props.ownerId;
    this.variables = Object.freeze({ ...props.variables });
    this.artifacts = Object.freeze([...props.artifacts]);
  }

  static create(props: ExecutionContextProps): ExecutionContext {
    return new ExecutionContext(props);
  }

  withArtifact(artifact: ExecutionArtifact): ExecutionContext {
    return ExecutionContext.create({
      planId: this.planId,
      campaignId: this.campaignId,
      ownerId: this.ownerId,
      variables: { ...this.variables },
      artifacts: [...this.artifacts, artifact],
    });
  }

  withVariable(key: string, value: unknown): ExecutionContext {
    return ExecutionContext.create({
      planId: this.planId,
      campaignId: this.campaignId,
      ownerId: this.ownerId,
      variables: { ...this.variables, [key]: value },
      artifacts: [...this.artifacts],
    });
  }

  getArtifactsForNode(nodeId: string): ExecutionArtifact[] {
    return this.artifacts.filter(a => a.nodeId === nodeId);
  }

  getVariable(key: string): unknown {
    return this.variables[key];
  }
}
