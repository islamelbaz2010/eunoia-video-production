import { ExecutionValidator } from '../../../src/execution/validation/ExecutionValidator';
import { ExecutionGraph } from '../../../src/execution/domain/models/ExecutionGraph';
import { ExecutionNode } from '../../../src/execution/domain/models/ExecutionNode';
import { ExecutionEdge } from '../../../src/execution/domain/models/ExecutionEdge';
import { NodeType } from '../../../src/execution/domain/models/NodeType';

function makeNode(type = NodeType.GenerateScript): ExecutionNode {
  return ExecutionNode.create({
    planId: 'plan-1',
    type,
    priority: 1,
    config: {},
    maxRetries: 2,
    estimatedDurationMs: 5000,
    estimatedCost: 0,
    metadata: {},
  });
}

function makeEdge(from: string, to: string): ExecutionEdge {
  return ExecutionEdge.create({ fromNodeId: from, toNodeId: to, condition: 'on_success' });
}

function makeGraph(nodes: ExecutionNode[], edges: ExecutionEdge[]): ExecutionGraph {
  return ExecutionGraph.create({ planId: 'plan-1', nodes, edges });
}

describe('ExecutionValidator', () => {
  let validator: ExecutionValidator;

  beforeEach(() => {
    validator = new ExecutionValidator();
  });

  describe('validate', () => {
    it('returns valid for a well-formed acyclic graph', () => {
      const a = makeNode();
      const b = makeNode(NodeType.GenerateImage);
      const graph = makeGraph([a, b], [makeEdge(a.id, b.id)]);
      const result = validator.validate(graph);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('returns error for empty graph', () => {
      const graph = makeGraph([], []);
      const result = validator.validate(graph);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'EMPTY_GRAPH')).toBe(true);
    });

    it('returns error for cycle', () => {
      const a = makeNode();
      const b = makeNode(NodeType.GenerateImage);
      const graph = makeGraph([a, b], [makeEdge(a.id, b.id), makeEdge(b.id, a.id)]);
      const result = validator.validate(graph);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'CYCLE_DETECTED')).toBe(true);
    });

    it('returns error for edge referencing missing from-node', () => {
      const a = makeNode();
      const graph = makeGraph([a], [makeEdge('nonexistent', a.id)]);
      const result = validator.validate(graph);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'MISSING_DEPENDENCY')).toBe(true);
    });

    it('returns error for edge referencing missing to-node', () => {
      const a = makeNode();
      const graph = makeGraph([a], [makeEdge(a.id, 'nonexistent')]);
      const result = validator.validate(graph);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'MISSING_DEPENDENCY')).toBe(true);
    });

    it('returns error for duplicate node ids', () => {
      const a = makeNode();
      const aDup = ExecutionNode.reconstitute({
        id: a.id,
        planId: 'plan-1',
        type: NodeType.GenerateImage,
        status: a.status,
        priority: 1,
        config: {},
        result: null,
        retryCount: 0,
        maxRetries: 2,
        estimatedDurationMs: 5000,
        estimatedCost: 0,
        startedAt: null,
        completedAt: null,
        error: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const graph = makeGraph([a, aDup], []);
      const result = validator.validate(graph);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'DUPLICATE_NODE_ID')).toBe(true);
    });

    it('returns valid for a single isolated node', () => {
      const a = makeNode();
      const graph = makeGraph([a], []);
      const result = validator.validate(graph);
      expect(result.valid).toBe(true);
    });
  });
});
