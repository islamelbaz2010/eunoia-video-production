import { ExecutionGraphEngine } from '../../../src/execution/graph/ExecutionGraphEngine';
import { ExecutionNode } from '../../../src/execution/domain/models/ExecutionNode';
import { ExecutionEdge } from '../../../src/execution/domain/models/ExecutionEdge';
import { ExecutionStatus } from '../../../src/execution/domain/models/ExecutionStatus';
import { NodeType } from '../../../src/execution/domain/models/NodeType';

function makeNode(type = NodeType.GenerateScript): ExecutionNode {
  return ExecutionNode.create({
    planId: 'plan-1',
    type,
    priority: 1,
    config: {},
    maxRetries: 2,
    estimatedDurationMs: 1000,
    estimatedCost: 0,
    metadata: {},
  });
}

function makeEdge(from: string, to: string): ExecutionEdge {
  return ExecutionEdge.create({ fromNodeId: from, toNodeId: to, condition: 'on_success' });
}

describe('ExecutionGraphEngine', () => {
  let engine: ExecutionGraphEngine;

  beforeEach(() => {
    engine = new ExecutionGraphEngine();
  });

  describe('detectCycles', () => {
    it('returns false for empty graph', () => {
      expect(engine.detectCycles([], [])).toBe(false);
    });

    it('returns false for acyclic graph A -> B -> C', () => {
      const a = makeNode();
      const b = makeNode(NodeType.GenerateImage);
      const c = makeNode(NodeType.GenerateVoice);
      expect(engine.detectCycles([a, b, c], [makeEdge(a.id, b.id), makeEdge(b.id, c.id)])).toBe(false);
    });

    it('detects direct cycle A -> B -> A', () => {
      const a = makeNode();
      const b = makeNode(NodeType.GenerateImage);
      expect(engine.detectCycles([a, b], [makeEdge(a.id, b.id), makeEdge(b.id, a.id)])).toBe(true);
    });

    it('detects self-loop A -> A', () => {
      const a = makeNode();
      expect(engine.detectCycles([a], [makeEdge(a.id, a.id)])).toBe(true);
    });

    it('detects indirect cycle A -> B -> C -> A', () => {
      const a = makeNode();
      const b = makeNode(NodeType.GenerateImage);
      const c = makeNode(NodeType.GenerateVoice);
      const edges = [makeEdge(a.id, b.id), makeEdge(b.id, c.id), makeEdge(c.id, a.id)];
      expect(engine.detectCycles([a, b, c], edges)).toBe(true);
    });

    it('returns false for diamond DAG', () => {
      const a = makeNode();
      const b = makeNode(NodeType.GenerateImage);
      const c = makeNode(NodeType.GenerateVoice);
      const d = makeNode(NodeType.AssembleVideo);
      const edges = [
        makeEdge(a.id, b.id),
        makeEdge(a.id, c.id),
        makeEdge(b.id, d.id),
        makeEdge(c.id, d.id),
      ];
      expect(engine.detectCycles([a, b, c, d], edges)).toBe(false);
    });
  });

  describe('topologicalSort', () => {
    it('returns empty array for empty input', () => {
      expect(engine.topologicalSort([], [])).toHaveLength(0);
    });

    it('returns single node when no edges', () => {
      const a = makeNode();
      expect(engine.topologicalSort([a], [])).toHaveLength(1);
    });

    it('sorts A -> B -> C so A comes before B before C', () => {
      const a = makeNode();
      const b = makeNode(NodeType.GenerateImage);
      const c = makeNode(NodeType.GenerateVoice);
      const sorted = engine.topologicalSort(
        [c, b, a],
        [makeEdge(a.id, b.id), makeEdge(b.id, c.id)],
      );

      const idxA = sorted.findIndex(n => n.id === a.id);
      const idxB = sorted.findIndex(n => n.id === b.id);
      const idxC = sorted.findIndex(n => n.id === c.id);

      expect(idxA).toBeLessThan(idxB);
      expect(idxB).toBeLessThan(idxC);
    });

    it('handles diamond DAG: A before B and C, both before D', () => {
      const a = makeNode();
      const b = makeNode(NodeType.GenerateImage);
      const c = makeNode(NodeType.GenerateVoice);
      const d = makeNode(NodeType.AssembleVideo);
      const edges = [
        makeEdge(a.id, b.id),
        makeEdge(a.id, c.id),
        makeEdge(b.id, d.id),
        makeEdge(c.id, d.id),
      ];
      const sorted = engine.topologicalSort([d, c, b, a], edges);
      const idxA = sorted.findIndex(n => n.id === a.id);
      const idxD = sorted.findIndex(n => n.id === d.id);
      expect(idxA).toBeLessThan(idxD);
    });
  });

  describe('getParallelGroups', () => {
    it('returns single group for nodes with no edges', () => {
      const a = makeNode();
      const b = makeNode(NodeType.GenerateImage);
      const groups = engine.getParallelGroups([a, b], []);
      expect(groups).toHaveLength(1);
      expect(groups[0]).toHaveLength(2);
    });

    it('returns two groups for simple A -> B chain', () => {
      const a = makeNode();
      const b = makeNode(NodeType.GenerateImage);
      const groups = engine.getParallelGroups([a, b], [makeEdge(a.id, b.id)]);
      expect(groups).toHaveLength(2);
      const firstIds = groups[0]?.map(n => n.id) ?? [];
      const secondIds = groups[1]?.map(n => n.id) ?? [];
      expect(firstIds).toContain(a.id);
      expect(secondIds).toContain(b.id);
    });

    it('groups parallel nodes at the same level', () => {
      const a = makeNode();
      const b = makeNode(NodeType.GenerateImage);
      const c = makeNode(NodeType.GenerateVoice);
      const d = makeNode(NodeType.AssembleVideo);
      const edges = [makeEdge(a.id, d.id), makeEdge(b.id, d.id), makeEdge(c.id, d.id)];
      const groups = engine.getParallelGroups([a, b, c, d], edges);
      expect(groups).toHaveLength(2);
      const firstGroup = groups[0] ?? [];
      expect(firstGroup).toHaveLength(3);
    });
  });

  describe('getReadyNodes', () => {
    it('returns nodes with no predecessors when nothing is completed', () => {
      const a = makeNode();
      const b = makeNode(NodeType.GenerateImage);
      const ready = engine.getReadyNodes([a, b], [], new Set(), new Set());
      expect(ready).toHaveLength(2);
    });

    it('returns successor once predecessor is completed', () => {
      const a = makeNode();
      const b = makeNode(NodeType.GenerateImage);
      const ready = engine.getReadyNodes(
        [a, b],
        [makeEdge(a.id, b.id)],
        new Set([a.id]),
        new Set(),
      );
      expect(ready.map(n => n.id)).toContain(b.id);
    });

    it('excludes nodes that are already running or terminal', () => {
      const a = makeNode();
      const running = a.withStatus(ExecutionStatus.Running);
      const ready = engine.getReadyNodes([running], [], new Set(), new Set());
      expect(ready).toHaveLength(0);
    });

    it('treats cancelled predecessors as completed for downstream nodes', () => {
      const a = makeNode();
      const b = makeNode(NodeType.GenerateImage);
      const ready = engine.getReadyNodes(
        [a, b],
        [makeEdge(a.id, b.id)],
        new Set(),
        new Set([a.id]),
      );
      expect(ready.map(n => n.id)).toContain(b.id);
    });
  });

  describe('validate', () => {
    it('returns valid for a well-formed DAG', () => {
      const a = makeNode();
      const b = makeNode(NodeType.GenerateImage);
      const result = engine.validate([a, b], [makeEdge(a.id, b.id)]);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('returns errors for cycle', () => {
      const a = makeNode();
      const b = makeNode(NodeType.GenerateImage);
      const result = engine.validate([a, b], [makeEdge(a.id, b.id), makeEdge(b.id, a.id)]);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('cycle'))).toBe(true);
    });

    it('returns errors for duplicate node ids', () => {
      const a = makeNode();
      const aDuplicate = ExecutionNode.reconstitute({
        ...a,
        config: {},
        metadata: {},
        result: null,
        startedAt: null,
        completedAt: null,
        error: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const result = engine.validate([a, aDuplicate], []);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Duplicate'))).toBe(true);
    });

    it('returns errors for edges referencing missing nodes', () => {
      const a = makeNode();
      const result = engine.validate([a], [makeEdge(a.id, 'nonexistent-id')]);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('unknown'))).toBe(true);
    });
  });
});
