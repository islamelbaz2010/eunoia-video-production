export interface ExecutionDependencyProps {
  nodeId: string;
  dependsOn: string[];
}

export class ExecutionDependency {
  readonly nodeId: string;
  readonly dependsOn: ReadonlyArray<string>;

  private constructor(props: ExecutionDependencyProps) {
    this.nodeId = props.nodeId;
    this.dependsOn = Object.freeze([...props.dependsOn]);
  }

  static create(props: ExecutionDependencyProps): ExecutionDependency {
    return new ExecutionDependency(props);
  }

  hasDependencies(): boolean {
    return this.dependsOn.length > 0;
  }

  dependsOnNode(nodeId: string): boolean {
    return this.dependsOn.includes(nodeId);
  }
}
