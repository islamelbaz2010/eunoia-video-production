import type { ExecutionGraph } from '../domain/models/ExecutionGraph';
import { ExecutionGraphEngine } from '../graph/ExecutionGraphEngine';

export interface ValidationError {
  code: string;
  message: string;
  nodeId?: string;
}

export interface ExecutionValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export class ExecutionValidator {
  private readonly graphEngine: ExecutionGraphEngine;

  constructor() {
    this.graphEngine = new ExecutionGraphEngine();
  }

  validate(graph: ExecutionGraph): ExecutionValidationResult {
    const errors: ValidationError[] = [];

    if (graph.nodes.length === 0) {
      errors.push({ code: 'EMPTY_GRAPH', message: 'Graph has no nodes' });
      return { valid: false, errors };
    }

    const nodeIds = new Set(graph.nodes.map(n => n.id));
    const seen = new Set<string>();

    for (const node of graph.nodes) {
      if (seen.has(node.id)) {
        errors.push({
          code: 'DUPLICATE_NODE_ID',
          message: `Duplicate node id: ${node.id}`,
          nodeId: node.id,
        });
      }
      seen.add(node.id);
    }

    for (const edge of graph.edges) {
      if (!nodeIds.has(edge.fromNodeId)) {
        errors.push({
          code: 'MISSING_DEPENDENCY',
          message: `Edge references unknown fromNodeId: ${edge.fromNodeId}`,
        });
      }
      if (!nodeIds.has(edge.toNodeId)) {
        errors.push({
          code: 'MISSING_DEPENDENCY',
          message: `Edge references unknown toNodeId: ${edge.toNodeId}`,
        });
      }
    }

    if (this.graphEngine.detectCycles([...graph.nodes], [...graph.edges])) {
      errors.push({ code: 'CYCLE_DETECTED', message: 'Execution graph contains a cycle' });
    }

    const sorted = this.graphEngine.topologicalSort([...graph.nodes], [...graph.edges]);
    const reachableIds = new Set(sorted.map(n => n.id));
    for (const node of graph.nodes) {
      if (!reachableIds.has(node.id)) {
        errors.push({
          code: 'UNREACHABLE_NODE',
          message: `Node is unreachable in execution order: ${node.id}`,
          nodeId: node.id,
        });
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
