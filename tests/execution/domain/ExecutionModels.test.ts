import { ExecutionArtifact } from '../../../src/execution/domain/models/ExecutionArtifact';
import { ExecutionCheckpoint } from '../../../src/execution/domain/models/ExecutionCheckpoint';
import { ExecutionContext } from '../../../src/execution/domain/models/ExecutionContext';
import { ExecutionEdge } from '../../../src/execution/domain/models/ExecutionEdge';
import { ExecutionGraph } from '../../../src/execution/domain/models/ExecutionGraph';
import { ExecutionNode } from '../../../src/execution/domain/models/ExecutionNode';
import { ExecutionResult } from '../../../src/execution/domain/models/ExecutionResult';
import { ExecutionDependency } from '../../../src/execution/domain/models/ExecutionDependency';
import { ExecutionPlan } from '../../../src/execution/domain/models/ExecutionPlan';
import { ExecutionStatus } from '../../../src/execution/domain/models/ExecutionStatus';
import { NodeType } from '../../../src/execution/domain/models/NodeType';

function makeNode(): ExecutionNode {
  return ExecutionNode.create({
    planId: 'plan-1',
    type: NodeType.GenerateScript,
    priority: 1,
    config: {},
    maxRetries: 2,
    estimatedDurationMs: 5000,
    estimatedCost: 0,
    metadata: {},
  });
}

function makeGraph(): ExecutionGraph {
  return ExecutionGraph.create({ planId: 'plan-1', nodes: [], edges: [] });
}

function makeContext(): ExecutionContext {
  return ExecutionContext.create({
    planId: 'plan-1',
    campaignId: null,
    ownerId: 'owner-1',
    variables: {},
    artifacts: [],
  });
}

describe('ExecutionArtifact', () => {
  it('reconstitute restores all fields including id and createdAt', () => {
    const now = new Date();
    const artifact = ExecutionArtifact.reconstitute({
      id: 'art-1',
      nodeId: 'node-1',
      type: 'generate_image',
      url: 'https://example.com/image.png',
      data: { width: 1920 },
      createdAt: now,
    });
    expect(artifact.id).toBe('art-1');
    expect(artifact.url).toBe('https://example.com/image.png');
    expect(artifact.data['width']).toBe(1920);
  });

  it('create generates unique id and freezes data', () => {
    const a1 = ExecutionArtifact.create({ nodeId: 'n1', type: 'img', url: null, data: {} });
    const a2 = ExecutionArtifact.create({ nodeId: 'n1', type: 'img', url: null, data: {} });
    expect(a1.id).not.toBe(a2.id);
    expect(() => (a1.data as Record<string, unknown>)['x'] = 1).toThrow();
  });
});

describe('ExecutionCheckpoint', () => {
  it('completedNodeCount returns the number of tracked node statuses', () => {
    const cp = ExecutionCheckpoint.create({
      planId: 'plan-1',
      nodeStatuses: {
        'node-1': ExecutionStatus.Succeeded,
        'node-2': ExecutionStatus.Failed,
      },
      artifacts: [],
    });
    expect(cp.completedNodeCount()).toBe(2);
  });

  it('getNodeStatus returns correct status for known node', () => {
    const cp = ExecutionCheckpoint.create({
      planId: 'plan-1',
      nodeStatuses: { 'node-x': ExecutionStatus.Cancelled },
      artifacts: [],
    });
    expect(cp.getNodeStatus('node-x')).toBe(ExecutionStatus.Cancelled);
    expect(cp.getNodeStatus('missing')).toBeUndefined();
  });
});

describe('ExecutionContext', () => {
  it('withArtifact returns new context with artifact appended', () => {
    const ctx = makeContext();
    const artifact = ExecutionArtifact.create({ nodeId: 'n1', type: 'img', url: null, data: {} });
    const updated = ctx.withArtifact(artifact);
    expect(updated.artifacts).toHaveLength(1);
    expect(ctx.artifacts).toHaveLength(0);
  });

  it('withVariable returns new context with variable set', () => {
    const ctx = makeContext();
    const updated = ctx.withVariable('imageUrl', 'mock://img.png');
    expect(updated.getVariable('imageUrl')).toBe('mock://img.png');
    expect(ctx.getVariable('imageUrl')).toBeUndefined();
  });

  it('getArtifactsForNode returns only matching artifacts', () => {
    const artifact1 = ExecutionArtifact.create({ nodeId: 'n1', type: 'img', url: null, data: {} });
    const artifact2 = ExecutionArtifact.create({ nodeId: 'n2', type: 'vid', url: null, data: {} });
    const ctx = makeContext().withArtifact(artifact1).withArtifact(artifact2);
    const forN1 = ctx.getArtifactsForNode('n1');
    expect(forN1).toHaveLength(1);
    expect(forN1[0]?.nodeId).toBe('n1');
  });

  it('getVariable returns undefined for unknown key', () => {
    const ctx = makeContext();
    expect(ctx.getVariable('nonexistent')).toBeUndefined();
  });
});

describe('ExecutionEdge', () => {
  it('reconstitute restores edge fields', () => {
    const edge = ExecutionEdge.reconstitute({
      fromNodeId: 'a',
      toNodeId: 'b',
      condition: 'on_failure',
    });
    expect(edge.fromNodeId).toBe('a');
    expect(edge.condition).toBe('on_failure');
  });

  it('isConditional returns true for non-always conditions', () => {
    const edge = ExecutionEdge.create({ fromNodeId: 'a', toNodeId: 'b', condition: 'on_success' });
    expect(edge.isConditional()).toBe(true);
  });

  it('isConditional returns false for always condition', () => {
    const edge = ExecutionEdge.create({ fromNodeId: 'a', toNodeId: 'b', condition: 'always' });
    expect(edge.isConditional()).toBe(false);
  });
});

describe('ExecutionGraph', () => {
  it('getSuccessors returns successor node instances', () => {
    const a = makeNode();
    const b = makeNode();
    const e = ExecutionEdge.create({ fromNodeId: a.id, toNodeId: b.id, condition: 'on_success' });
    const graph = ExecutionGraph.create({ planId: 'p1', nodes: [a, b], edges: [e] });
    const successors = graph.getSuccessors(a.id);
    expect(successors).toHaveLength(1);
    expect(successors[0]?.id).toBe(b.id);
  });

  it('getPredecessors returns predecessor node instances', () => {
    const a = makeNode();
    const b = makeNode();
    const e = ExecutionEdge.create({ fromNodeId: a.id, toNodeId: b.id, condition: 'on_success' });
    const graph = ExecutionGraph.create({ planId: 'p1', nodes: [a, b], edges: [e] });
    const predecessors = graph.getPredecessors(b.id);
    expect(predecessors).toHaveLength(1);
    expect(predecessors[0]?.id).toBe(a.id);
  });

  it('getSuccessors returns empty array when node has no successors', () => {
    const a = makeNode();
    const graph = ExecutionGraph.create({ planId: 'p1', nodes: [a], edges: [] });
    expect(graph.getSuccessors(a.id)).toHaveLength(0);
  });
});

describe('ExecutionResult', () => {
  it('isSuccess returns true for Succeeded status', () => {
    const result = ExecutionResult.create({
      nodeId: 'n1',
      status: ExecutionStatus.Succeeded,
      output: {},
      durationMs: 1000,
      error: null,
      completedAt: new Date(),
    });
    expect(result.isSuccess()).toBe(true);
    expect(result.isFailure()).toBe(false);
  });

  it('isFailure returns true for Failed status', () => {
    const result = ExecutionResult.create({
      nodeId: 'n1',
      status: ExecutionStatus.Failed,
      output: {},
      durationMs: 500,
      error: 'timeout',
      completedAt: new Date(),
    });
    expect(result.isFailure()).toBe(true);
    expect(result.isSuccess()).toBe(false);
  });

  it('freezes output object', () => {
    const result = ExecutionResult.create({
      nodeId: 'n1',
      status: ExecutionStatus.Succeeded,
      output: { url: 'mock://file' },
      durationMs: 100,
      error: null,
      completedAt: new Date(),
    });
    expect(() => (result.output as Record<string, unknown>)['injected'] = true).toThrow();
  });
});

describe('ExecutionDependency', () => {
  it('hasDependencies returns true when dependsOn is non-empty', () => {
    const dep = ExecutionDependency.create({ nodeId: 'n1', dependsOn: ['n2', 'n3'] });
    expect(dep.hasDependencies()).toBe(true);
  });

  it('hasDependencies returns false when dependsOn is empty', () => {
    const dep = ExecutionDependency.create({ nodeId: 'n1', dependsOn: [] });
    expect(dep.hasDependencies()).toBe(false);
  });

  it('dependsOnNode returns true for included nodeId', () => {
    const dep = ExecutionDependency.create({ nodeId: 'n1', dependsOn: ['n2'] });
    expect(dep.dependsOnNode('n2')).toBe(true);
    expect(dep.dependsOnNode('n3')).toBe(false);
  });

  it('freezes dependsOn array', () => {
    const dep = ExecutionDependency.create({ nodeId: 'n1', dependsOn: ['n2'] });
    expect(() => (dep.dependsOn as string[]).push('n3')).toThrow();
  });
});

describe('ExecutionPlan', () => {
  it('withContext replaces context and bumps updatedAt', () => {
    const plan = ExecutionPlan.create({
      campaignId: null,
      ownerId: 'owner-1',
      productionPlanId: null,
      graph: makeGraph(),
      context: makeContext(),
      estimatedDurationMs: 0,
      estimatedCost: 0,
    });
    const newCtx = ExecutionContext.create({
      planId: plan.id,
      campaignId: 'c-1',
      ownerId: 'owner-1',
      variables: { key: 'value' },
      artifacts: [],
    });
    const updated = plan.withContext(newCtx);
    expect(updated.context.campaignId).toBe('c-1');
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(plan.updatedAt.getTime());
  });
});
