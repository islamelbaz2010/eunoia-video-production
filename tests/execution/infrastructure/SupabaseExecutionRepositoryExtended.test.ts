import { SupabaseExecutionRepository } from '../../../src/execution/infrastructure/SupabaseExecutionRepository';
import { ExecutionPlan } from '../../../src/execution/domain/models/ExecutionPlan';
import { ExecutionGraph } from '../../../src/execution/domain/models/ExecutionGraph';
import { ExecutionNode } from '../../../src/execution/domain/models/ExecutionNode';
import { ExecutionEdge } from '../../../src/execution/domain/models/ExecutionEdge';
import { ExecutionContext } from '../../../src/execution/domain/models/ExecutionContext';
import { ExecutionArtifact } from '../../../src/execution/domain/models/ExecutionArtifact';
import { ExecutionCheckpoint } from '../../../src/execution/domain/models/ExecutionCheckpoint';
import { ExecutionResult } from '../../../src/execution/domain/models/ExecutionResult';
import { ExecutionStatus } from '../../../src/execution/domain/models/ExecutionStatus';
import { NodeType } from '../../../src/execution/domain/models/NodeType';
import type { ILogger } from '../../../src/shared/logger/ILogger';
import { RepositoryError } from '../../../src/shared/errors/AppError';
import type { SupabaseClient } from '@supabase/supabase-js';

function makeLogger(): jest.Mocked<ILogger> {
  return {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: jest.fn().mockReturnThis(),
  } as unknown as jest.Mocked<ILogger>;
}

function makeBuilder(result: { data?: unknown; error?: { message: string } | null } = { data: null, error: null }) {
  const builder: Record<string, jest.Mock> = {};
  for (const method of ['select', 'upsert', 'update', 'delete', 'eq', 'order', 'limit', 'range']) {
    builder[method] = jest.fn().mockReturnValue(builder);
  }
  builder['single'] = jest.fn().mockResolvedValue(result);
  builder['maybeSingle'] = jest.fn().mockResolvedValue(result);
  builder['then'] = jest.fn().mockImplementation(
    (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  );
  return builder;
}

function makeClient(builder: ReturnType<typeof makeBuilder>): SupabaseClient {
  return { from: jest.fn().mockReturnValue(builder) } as unknown as SupabaseClient;
}

function makeNodeWithResult(): ExecutionNode {
  const node = ExecutionNode.create({
    planId: 'plan-1',
    type: NodeType.GenerateImage,
    priority: 1,
    config: { style: 'bold' },
    maxRetries: 2,
    estimatedDurationMs: 30000,
    estimatedCost: 0.1,
    metadata: {},
  });
  const result = ExecutionResult.create({
    nodeId: node.id,
    status: ExecutionStatus.Succeeded,
    output: { url: 'mock://img.png', width: 1920 },
    durationMs: 5000,
    error: null,
    completedAt: new Date(),
  });
  return node.withResult(result);
}

function makeEdge(from: string, to: string): ExecutionEdge {
  return ExecutionEdge.create({ fromNodeId: from, toNodeId: to, condition: 'on_success' });
}

function makeArtifact(nodeId: string): ExecutionArtifact {
  return ExecutionArtifact.create({
    nodeId,
    type: 'generate_image',
    url: 'mock://img.png',
    data: { width: 1920, height: 1080 },
  });
}

function makePlanRow(
  planId: string,
  nodeWithResult: ExecutionNode,
  edge?: ExecutionEdge,
  contextArtifacts: ExecutionArtifact[] = [],
) {
  return {
    id: planId,
    campaign_id: 'campaign-1',
    owner_id: 'owner-1',
    production_plan_id: null,
    graph: {
      id: 'graph-1',
      planId,
      nodes: [
        {
          id: nodeWithResult.id,
          planId,
          type: nodeWithResult.type,
          status: nodeWithResult.status,
          priority: 1,
          config: nodeWithResult.config,
          result: nodeWithResult.result !== null
            ? {
                nodeId: nodeWithResult.result.nodeId,
                status: nodeWithResult.result.status,
                output: nodeWithResult.result.output,
                durationMs: nodeWithResult.result.durationMs,
                error: nodeWithResult.result.error,
                completedAt: nodeWithResult.result.completedAt.toISOString(),
              }
            : null,
          retryCount: 0,
          maxRetries: 2,
          estimatedDurationMs: 30000,
          estimatedCost: 0.1,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          error: null,
          metadata: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      edges: edge
        ? [{ fromNodeId: edge.fromNodeId, toNodeId: edge.toNodeId, condition: edge.condition }]
        : [],
      createdAt: new Date().toISOString(),
    },
    context: {
      planId,
      campaignId: null,
      ownerId: 'owner-1',
      variables: {},
      artifacts: contextArtifacts.map(a => ({
        id: a.id,
        nodeId: a.nodeId,
        type: a.type,
        url: a.url,
        data: a.data,
        createdAt: a.createdAt.toISOString(),
      })),
    },
    status: 'succeeded',
    estimated_duration_ms: 60000,
    estimated_cost: 1.0,
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

describe('SupabaseExecutionRepository — extended coverage', () => {
  let logger: jest.Mocked<ILogger>;

  beforeEach(() => {
    logger = makeLogger();
  });

  describe('savePlan — with node result and edges', () => {
    it('serializes node result correctly', async () => {
      const node = makeNodeWithResult();
      const graph = ExecutionGraph.create({ planId: 'plan-1', nodes: [node], edges: [] });
      const context = ExecutionContext.create({
        planId: graph.id,
        campaignId: null,
        ownerId: 'owner-1',
        variables: {},
        artifacts: [],
      });
      const plan = ExecutionPlan.create({
        campaignId: null,
        ownerId: 'owner-1',
        productionPlanId: null,
        graph,
        context,
        estimatedDurationMs: 60000,
        estimatedCost: 1.0,
      });

      const row = makePlanRow(plan.id, node);
      const builder = makeBuilder({ data: row, error: null });
      const repo = new SupabaseExecutionRepository(makeClient(builder), logger);

      const result = await repo.savePlan(plan);
      expect(result.id).toBe(plan.id);
      const savedNode = result.graph.nodes[0];
      expect(savedNode?.result).not.toBeNull();
      expect(savedNode?.status).toBe(ExecutionStatus.Succeeded);
    });

    it('serializes edges correctly', async () => {
      const a = ExecutionNode.create({
        planId: 'plan-1',
        type: NodeType.GenerateScript,
        priority: 1,
        config: {},
        maxRetries: 0,
        estimatedDurationMs: 5000,
        estimatedCost: 0,
        metadata: {},
      });
      const b = makeNodeWithResult();
      const edge = makeEdge(a.id, b.id);

      const graph = ExecutionGraph.create({ planId: 'plan-1', nodes: [a, b], edges: [edge] });
      const context = ExecutionContext.create({
        planId: graph.id,
        campaignId: null,
        ownerId: 'owner-1',
        variables: {},
        artifacts: [],
      });
      const plan = ExecutionPlan.create({
        campaignId: null,
        ownerId: 'owner-1',
        productionPlanId: null,
        graph,
        context,
        estimatedDurationMs: 0,
        estimatedCost: 0,
      });

      const row = makePlanRow(plan.id, b, edge);
      // Add the other node to the row
      (row.graph.nodes as unknown[]).unshift({
        id: a.id,
        planId: 'plan-1',
        type: a.type,
        status: a.status,
        priority: 1,
        config: {},
        result: null,
        retryCount: 0,
        maxRetries: 0,
        estimatedDurationMs: 5000,
        estimatedCost: 0,
        startedAt: null,
        completedAt: null,
        error: null,
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const builder = makeBuilder({ data: row, error: null });
      const repo = new SupabaseExecutionRepository(makeClient(builder), logger);

      const result = await repo.savePlan(plan);
      expect(result.graph.edges).toHaveLength(1);
      expect(result.graph.edges[0]?.fromNodeId).toBe(a.id);
    });
  });

  describe('findPlanById — with artifacts in context', () => {
    it('deserializes context artifacts correctly', async () => {
      const node = makeNodeWithResult();
      const artifact = makeArtifact(node.id);
      const row = makePlanRow('plan-1', node, undefined, [artifact]);
      const builder = makeBuilder({ data: row, error: null });
      const repo = new SupabaseExecutionRepository(makeClient(builder), logger);

      const result = await repo.findPlanById('plan-1');
      expect(result?.context.artifacts).toHaveLength(1);
      expect(result?.context.artifacts[0]?.nodeId).toBe(node.id);
    });
  });

  describe('findAllPlans — campaignId filter', () => {
    it('applies campaignId filter', async () => {
      const builder = makeBuilder({ data: [], error: null });
      const repo = new SupabaseExecutionRepository(makeClient(builder), logger);

      await repo.findAllPlans({ campaignId: 'campaign-abc' });
      expect(builder['eq']).toHaveBeenCalledWith('campaign_id', 'campaign-abc');
    });

    it('applies limit and offset (range)', async () => {
      const builder = makeBuilder({ data: [], error: null });
      const repo = new SupabaseExecutionRepository(makeClient(builder), logger);

      await repo.findAllPlans({ limit: 10, offset: 20 });
      expect(builder['range']).toHaveBeenCalledWith(20, 29);
    });
  });

  describe('findLatestCheckpoint — error path', () => {
    it('throws RepositoryError on error', async () => {
      const builder = makeBuilder({ data: null, error: { message: 'db failure' } });
      const repo = new SupabaseExecutionRepository(makeClient(builder), logger);
      await expect(repo.findLatestCheckpoint('plan-1')).rejects.toThrow(RepositoryError);
    });
  });

  describe('findCheckpointsByPlanId — with artifacts', () => {
    it('deserializes checkpoint artifacts correctly', async () => {
      const artifact = makeArtifact('node-1');
      const checkpointRow = {
        id: 'cp-1',
        plan_id: 'plan-1',
        node_statuses: { 'node-1': ExecutionStatus.Succeeded },
        artifacts: [
          {
            id: artifact.id,
            nodeId: artifact.nodeId,
            type: artifact.type,
            url: artifact.url,
            data: artifact.data,
            createdAt: artifact.createdAt.toISOString(),
          },
        ],
        created_at: new Date().toISOString(),
      };
      const builder = makeBuilder({ data: [checkpointRow], error: null });
      const repo = new SupabaseExecutionRepository(makeClient(builder), logger);

      const result = await repo.findCheckpointsByPlanId('plan-1');
      expect(result).toHaveLength(1);
      expect(result[0]?.artifacts).toHaveLength(1);
      expect(result[0]?.artifacts[0]?.url).toBe('mock://img.png');
    });
  });

  describe('saveCheckpoint — with artifacts', () => {
    it('serializes checkpoint artifacts correctly', async () => {
      const artifact = makeArtifact('node-2');
      const checkpoint = ExecutionCheckpoint.create({
        planId: 'plan-1',
        nodeStatuses: { 'node-2': ExecutionStatus.Succeeded },
        artifacts: [artifact],
      });

      const checkpointRow = {
        id: checkpoint.id,
        plan_id: 'plan-1',
        node_statuses: { 'node-2': ExecutionStatus.Succeeded },
        artifacts: [
          {
            id: artifact.id,
            nodeId: artifact.nodeId,
            type: artifact.type,
            url: artifact.url,
            data: artifact.data,
            createdAt: artifact.createdAt.toISOString(),
          },
        ],
        created_at: checkpoint.createdAt.toISOString(),
      };

      const builder = makeBuilder({ data: checkpointRow, error: null });
      const repo = new SupabaseExecutionRepository(makeClient(builder), logger);

      const result = await repo.saveCheckpoint(checkpoint);
      expect(result.artifacts).toHaveLength(1);
      expect(result.artifacts[0]?.type).toBe('generate_image');
    });
  });
});
