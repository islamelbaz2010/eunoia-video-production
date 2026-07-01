import { randomUUID } from 'crypto';

export interface ExecutionArtifactProps {
  id: string;
  nodeId: string;
  type: string;
  url: string | null;
  data: Record<string, unknown>;
  createdAt: Date;
}

export type CreateExecutionArtifactProps = Omit<ExecutionArtifactProps, 'id' | 'createdAt'>;

export class ExecutionArtifact {
  readonly id: string;
  readonly nodeId: string;
  readonly type: string;
  readonly url: string | null;
  readonly data: Readonly<Record<string, unknown>>;
  readonly createdAt: Date;

  private constructor(props: ExecutionArtifactProps) {
    this.id = props.id;
    this.nodeId = props.nodeId;
    this.type = props.type;
    this.url = props.url;
    this.data = Object.freeze({ ...props.data });
    this.createdAt = new Date(props.createdAt);
  }

  static create(props: CreateExecutionArtifactProps): ExecutionArtifact {
    return new ExecutionArtifact({
      ...props,
      id: randomUUID(),
      createdAt: new Date(),
    });
  }

  static reconstitute(props: ExecutionArtifactProps): ExecutionArtifact {
    return new ExecutionArtifact(props);
  }
}
