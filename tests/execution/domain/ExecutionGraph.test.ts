import { ExecutionGraph } from '../../../src/execution/domain/models/ExecutionGraph';
import { ExecutionNode } from '../../../src/execution/domain/models/ExecutionNode';
import { ExecutionEdge } from '../../../src/execution/domain/models/ExecutionEdge';
import { ExecutionStatus } from '../../../src/execution/domain/models/ExecutionStatus';
import { NodeType } from '../../../src/execution/domain/models/NodeType';

function makeNode(type = NodeType.GenerateScript, status = ExecutionStatus.Pending): ExecutionNode {
  return ExecutionNode.create({
    planId: 'plan-1',
    type,
    priority: 1,
    config: {},
    maxRetries: 2,
    estimatedDurationMs: 5000,
    estimatedCost: 0,
    metadata: {},
  }).withStatus(status);
}

function makeEdge(from: string, to: string): ExecutionEdge {
  return ExecutionEdge.create({ fromNodeId: from, toNodeId: to, condition: 'on_success' });
}

describe('ExecutionGraph', () => {
  describe('create', () => {
    it('generates an id and createdAt', () => {
      const graph = ExecutionGraph.create({ planId: 'plan-1', nodes: [], edges: [] });
      expect(graph.id).toBeDefined();
      expect(graph.createdAt).toBeInstanceOf(Date);
    });

    it('freezes nodes and edges arrays', () => {
      const graph = ExecutionGraph.create({ planId: 'plan-1', nodes: [], edges: [] });
      expect(() => (graph.nodes as ExecutionNode[]).push(makeNode())).toThrow();
    });
  });

  describe('reconstitute', () => {
    it('restores all fields exactly', () => {
      const node = makeNode();
      const edge = makeEdge(node.id, 'other');
      const now = new Date();
      const graph = ExecutionGraph.reconstitute({
        id: 'graph-1',
        planId: 'plan-1',
        nodes: [node],
        edges: [edge],
        createdAt: now,
      });
      expect(graph.id).toBe('graph-1');
      expect(graph.nodes).toHaveLength(1);
      expect(graph.edges).toHaveLength(1);
    });
  });

  describe('withUpdatedNode', () => {
    it('replaces the matching node', () => {
      const a = makeNode();
      const b = makeNode(NodeType.GenerateImage);
      const graph = ExecutionGraph.create({ planId: 'plan-1', nodes: [a, b], edges: [] });

      const aRunning = a.withStatus(ExecutionStatus.Running);
      const updated = graph.withUpdatedNode(aRunning);

      expect(updated.getNode(a.id)?.status).toBe(ExecutionStatus.Running);
      expect(updated.getNode(b.id)?.status).toBe(ExecutionStatus.Pending);
    });

    it('does not mutate original graph', () => {
      const a = makeNode();
      const graph = ExecutionGraph.create({ planId: 'plan-1', nodes: [a], edges: [] });
      graph.withUpdatedNode(a.withStatus(ExecutionStatus.Running));
      expect(graph.getNode(a.id)?.status).toBe(ExecutionStatus.Pending);
    });
  });

  describe('getSuccessorIds / getPredecessorIds', () => {
    it('returns correct successor and predecessor ids', () => {
      const a = makeNode();
      const b = makeNode(NodeType.GenerateImage);
      const e = makeEdge(a.id, b.id);
      const graph = ExecutionGraph.create({ planId: 'plan-1', nodes: [a, b], edges: [e] });

      expect(graph.getSuccessorIds(a.id)).toEqual([b.id]);
      expect(graph.getPredecessorIds(b.id)).toEqual([a.id]);
      expect(graph.getSuccessorIds(b.id)).toHaveLength(0);
    });
  });

  describe('isComplete', () => {
    it('returns true when all nodes are terminal', () => {
      const a = makeNode(NodeType.GenerateScript, ExecutionStatus.Succeeded);
      const b = makeNode(NodeType.GenerateImage, ExecutionStatus.Skipped);
      const graph = ExecutionGraph.create({ planId: 'plan-1', nodes: [a, b], edges: [] });
      expect(graph.isComplete()).toBe(true);
    });

    it('returns false when any node is non-terminal', () => {
      const a = makeNode(NodeType.GenerateScript, ExecutionStatus.Succeeded);
      const b = makeNode(NodeType.GenerateImage, ExecutionStatus.Running);
      const graph = ExecutionGraph.create({ planId: 'plan-1', nodes: [a, b], edges: [] });
      expect(graph.isComplete()).toBe(false);
    });
  });

  describe('hasFailed', () => {
    it('returns true when at least one node has Failed status', () => {
      const a = makeNode(NodeType.GenerateScript, ExecutionStatus.Failed);
      const graph = ExecutionGraph.create({ planId: 'plan-1', nodes: [a], edges: [] });
      expect(graph.hasFailed()).toBe(true);
    });

    it('returns false when no node has Failed status', () => {
      const a = makeNode(NodeType.GenerateScript, ExecutionStatus.Succeeded);
      const graph = ExecutionGraph.create({ planId: 'plan-1', nodes: [a], edges: [] });
      expect(graph.hasFailed()).toBe(false);
    });
  });

  describe('succeededNodeCount / failedNodeCount', () => {
    it('counts correctly', () => {
      const a = makeNode(NodeType.GenerateScript, ExecutionStatus.Succeeded);
      const b = makeNode(NodeType.GenerateImage, ExecutionStatus.Failed);
      const c = makeNode(NodeType.GenerateVoice, ExecutionStatus.Pending);
      const graph = ExecutionGraph.create({ planId: 'plan-1', nodes: [a, b, c], edges: [] });
      expect(graph.succeededNodeCount()).toBe(1);
      expect(graph.failedNodeCount()).toBe(1);
    });
  });
});
