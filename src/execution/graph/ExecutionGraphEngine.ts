import type { ExecutionNode } from '../domain/models/ExecutionNode';
import type { ExecutionEdge } from '../domain/models/ExecutionEdge';
import { ExecutionStatus } from '../domain/models/ExecutionStatus';

export interface GraphValidationResult {
  valid: boolean;
  errors: string[];
}

export class ExecutionGraphEngine {
  detectCycles(nodes: ExecutionNode[], edges: ExecutionEdge[]): boolean {
    const nodeIds = new Set(nodes.map(n => n.id));
    const adjacency = new Map<string, string[]>();

    for (const node of nodes) {
      adjacency.set(node.id, []);
    }
    for (const edge of edges) {
      if (!nodeIds.has(edge.fromNodeId) || !nodeIds.has(edge.toNodeId)) {
        continue;
      }
      const list = adjacency.get(edge.fromNodeId);
      if (list !== undefined) {
        list.push(edge.toNodeId);
      }
    }

    const WHITE = 0;
    const GRAY = 1;
    const BLACK = 2;
    const color = new Map<string, number>();

    for (const id of nodeIds) {
      color.set(id, WHITE);
    }

    const hasCycleFrom = (id: string): boolean => {
      color.set(id, GRAY);
      const neighbors = adjacency.get(id) ?? [];
      for (const neighbor of neighbors) {
        const neighborColor = color.get(neighbor) ?? WHITE;
        if (neighborColor === GRAY) return true;
        if (neighborColor === WHITE && hasCycleFrom(neighbor)) return true;
      }
      color.set(id, BLACK);
      return false;
    };

    for (const id of nodeIds) {
      if ((color.get(id) ?? WHITE) === WHITE) {
        if (hasCycleFrom(id)) return true;
      }
    }

    return false;
  }

  topologicalSort(nodes: ExecutionNode[], edges: ExecutionEdge[]): ExecutionNode[] {
    const nodeMap = new Map<string, ExecutionNode>(nodes.map(n => [n.id, n]));
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();

    for (const node of nodes) {
      inDegree.set(node.id, 0);
      adjacency.set(node.id, []);
    }

    for (const edge of edges) {
      if (!nodeMap.has(edge.fromNodeId) || !nodeMap.has(edge.toNodeId)) continue;
      const list = adjacency.get(edge.fromNodeId);
      if (list !== undefined) list.push(edge.toNodeId);
      inDegree.set(edge.toNodeId, (inDegree.get(edge.toNodeId) ?? 0) + 1);
    }

    const queue: string[] = [];
    for (const [id, degree] of inDegree) {
      if (degree === 0) queue.push(id);
    }

    const sorted: ExecutionNode[] = [];

    while (queue.length > 0) {
      const id = queue.shift();
      if (id === undefined) break;
      const node = nodeMap.get(id);
      if (node !== undefined) sorted.push(node);

      for (const neighborId of adjacency.get(id) ?? []) {
        const newDegree = (inDegree.get(neighborId) ?? 0) - 1;
        inDegree.set(neighborId, newDegree);
        if (newDegree === 0) queue.push(neighborId);
      }
    }

    return sorted;
  }

  getParallelGroups(nodes: ExecutionNode[], edges: ExecutionEdge[]): ExecutionNode[][] {
    const nodeMap = new Map<string, ExecutionNode>(nodes.map(n => [n.id, n]));
    const level = new Map<string, number>();
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();
    const predecessors = new Map<string, string[]>();

    for (const node of nodes) {
      inDegree.set(node.id, 0);
      adjacency.set(node.id, []);
      predecessors.set(node.id, []);
    }

    for (const edge of edges) {
      if (!nodeMap.has(edge.fromNodeId) || !nodeMap.has(edge.toNodeId)) continue;
      const list = adjacency.get(edge.fromNodeId);
      if (list !== undefined) list.push(edge.toNodeId);
      const predList = predecessors.get(edge.toNodeId);
      if (predList !== undefined) predList.push(edge.fromNodeId);
      inDegree.set(edge.toNodeId, (inDegree.get(edge.toNodeId) ?? 0) + 1);
    }

    const queue: string[] = [];
    for (const [id, degree] of inDegree) {
      if (degree === 0) {
        queue.push(id);
        level.set(id, 0);
      }
    }

    while (queue.length > 0) {
      const id = queue.shift();
      if (id === undefined) break;
      const currentLevel = level.get(id) ?? 0;

      for (const neighborId of adjacency.get(id) ?? []) {
        const newDegree = (inDegree.get(neighborId) ?? 0) - 1;
        inDegree.set(neighborId, newDegree);
        const existingLevel = level.get(neighborId) ?? -1;
        level.set(neighborId, Math.max(existingLevel, currentLevel + 1));
        if (newDegree === 0) queue.push(neighborId);
      }
    }

    const maxLevel = Math.max(...level.values(), -1);
    const groups: ExecutionNode[][] = [];

    for (let i = 0; i <= maxLevel; i++) {
      const group: ExecutionNode[] = [];
      for (const [id, l] of level) {
        if (l === i) {
          const node = nodeMap.get(id);
          if (node !== undefined) group.push(node);
        }
      }
      if (group.length > 0) groups.push(group);
    }

    return groups;
  }

  getReadyNodes(
    nodes: ExecutionNode[],
    edges: ExecutionEdge[],
    completedIds: Set<string>,
    cancelledIds: Set<string>,
  ): ExecutionNode[] {
    const nodeIds = new Set(nodes.map(n => n.id));
    const predecessors = new Map<string, string[]>();

    for (const node of nodes) {
      predecessors.set(node.id, []);
    }

    for (const edge of edges) {
      if (!nodeIds.has(edge.fromNodeId) || !nodeIds.has(edge.toNodeId)) continue;
      const predList = predecessors.get(edge.toNodeId);
      if (predList !== undefined) predList.push(edge.fromNodeId);
    }

    return nodes.filter(node => {
      if (
        node.status !== ExecutionStatus.Pending &&
        node.status !== ExecutionStatus.Waiting &&
        node.status !== ExecutionStatus.Ready
      ) {
        return false;
      }
      const preds = predecessors.get(node.id) ?? [];
      return preds.every(predId => completedIds.has(predId) || cancelledIds.has(predId));
    });
  }

  validate(nodes: ExecutionNode[], edges: ExecutionEdge[]): GraphValidationResult {
    const errors: string[] = [];
    const nodeIds = new Set(nodes.map(n => n.id));

    const seen = new Set<string>();
    for (const node of nodes) {
      if (seen.has(node.id)) {
        errors.push(`Duplicate node id: ${node.id}`);
      }
      seen.add(node.id);
    }

    for (const edge of edges) {
      if (!nodeIds.has(edge.fromNodeId)) {
        errors.push(`Edge references unknown fromNodeId: ${edge.fromNodeId}`);
      }
      if (!nodeIds.has(edge.toNodeId)) {
        errors.push(`Edge references unknown toNodeId: ${edge.toNodeId}`);
      }
    }

    if (this.detectCycles(nodes, edges)) {
      errors.push('Graph contains a cycle');
    }

    if (nodes.length > 0) {
      const reachable = new Set<string>();
      const sorted = this.topologicalSort(nodes, edges);
      for (const n of sorted) reachable.add(n.id);
      for (const node of nodes) {
        if (!reachable.has(node.id)) {
          errors.push(`Node is unreachable: ${node.id}`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
