import { SupabaseExecutionRepository } from '../../../src/execution/infrastructure/SupabaseExecutionRepository';
import { ExecutionPlan } from '../../../src/execution/domain/models/ExecutionPlan';
import { ExecutionGraph } from '../../../src/execution/domain/models/ExecutionGraph';
import { ExecutionNode } from '../../../src/execution/domain/models/ExecutionNode';
import { ExecutionEdge } from '../../../src/execution/domain/models/ExecutionEdge';
import { ExecutionContext } from '../../../src/execution/domain/models/ExecutionContext';
import { ExecutionCheckpoint } from '../../../src/execution/domain/models/ExecutionCheckpoint';
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

interface QueryResult {
  data?: unknown;
  error?: { message: string } | null;
  count?: number | null;
}

function makeBuilder(result: QueryResult = { data: null, error: null }) {
  const builder: Record<string, jest.Mock> = {};

  for (const method of [
    'select', 'upsert', 'update', 'delete', 'eq', 'neq', 'order', 'limit', 'range',
  ]) {
    builder[method] = jest.fn().mockReturnValue(builder);
  }

  builder['single'] = jest.fn().mockResolvedValue(result);
  builder['maybeSingle'] = jest.fn().mockResolvedValue(result);
  builder['then'] = jest.fn().mockImplementation(
    (resolve: (v: QueryResult) => unknown, reject: (e: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  );

  return builder;
}

function makeClient(builder: ReturnType<typeof makeBuilder>): SupabaseClient {
  return {
    from: jest.fn().mockReturnValue(builder),
  } as unknown as SupabaseClient;
}

function makeNode(): ExecutionNode {
  return ExecutionNode.create({
    planId: 'plan-1',
    type: NodeType.GenerateScript,
    priority: 1,
    config: { key: 'value' },
    maxRetries: 2,
    estimatedDurationMs: 5000,
    estimatedCost: 0,
    metadata: {},
  });
}

function makeEdge(from: string, to: string): ExecutionEdge {
  return ExecutionEdge.create({ fromNodeId: from, toNodeId: to, condition: 'on_success' });
}

function makeGraph(nodes: ExecutionNode[] = [], edges: ExecutionEdge[] = []): ExecutionGraph {
  return ExecutionGraph.create({ planId: 'plan-1', nodes, edges });
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

function makePlan(): ExecutionPlan {
  const graph = makeGraph([makeNode()]);
  const context = makeContext();
  return ExecutionPlan.create({
    campaignId: 'campaign-1',
    ownerId: 'owner-1',
    productionPlanId: 'prod-1',
    graph,
    context,
    estimatedDurationMs: 60000,
    estimatedCost: 1.5,
  });
}

function planToRow(plan: ExecutionPlan): Record<string, unknown> {
  return {
    id: plan.id,
    campaign_id: plan.campaignId,
    owner_id: plan.ownerId,
    production_plan_id: plan.productionPlanId,
    graph: {
      id: plan.graph.id,
      planId: plan.graph.planId,
      nodes: plan.graph.nodes.map(n => ({
        id: n.id,
        planId: n.planId,
        type: n.type,
        status: n.status,
        priority: n.priority,
        config: n.config,
        result: null,
        retryCount: n.retryCount,
        maxRetries: n.maxRetries,
        estimatedDurationMs: n.estimatedDurationMs,
        estimatedCost: n.estimatedCost,
        startedAt: null,
        completedAt: null,
        error: null,
        metadata: n.metadata,
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString(),
      })),
      edges: plan.graph.edges.map(e => ({
        fromNodeId: e.fromNodeId,
        toNodeId: e.toNodeId,
        condition: e.condition,
      })),
      createdAt: plan.graph.createdAt.toISOString(),
    },
    context: {
      planId: plan.context.planId,
      campaignId: plan.context.campaignId,
      ownerId: plan.context.ownerId,
      variables: plan.context.variables,
      artifacts: [],
    },
    status: plan.status,
    estimated_duration_ms: plan.estimatedDurationMs,
    estimated_cost: plan.estimatedCost,
    started_at: null,
    completed_at: null,
    created_at: plan.createdAt.toISOString(),
    updated_at: plan.updatedAt.toISOString(),
  };
}

describe('SupabaseExecutionRepository', () => {
  let repo: SupabaseExecutionRepository;
  let logger: jest.Mocked<ILogger>;

  beforeEach(() => {
    logger = makeLogger();
  });

  describe('savePlan', () => {
    it('upserts the plan and returns reconstituted domain object', async () => {
      const plan = makePlan();
      const row = planToRow(plan);
      const builder = makeBuilder({ data: row, error: null });
      repo = new SupabaseExecutionRepository(makeClient(builder), logger);

      const result = await repo.savePlan(plan);

      expect(builder['upsert']).toHaveBeenCalledWith(expect.objectContaining({ id: plan.id }), { onConflict: 'id' });
      expect(result.id).toBe(plan.id);
      expect(result.status).toBe(ExecutionStatus.Pending);
    });

    it('throws RepositoryError on supabase error', async () => {
      const builder = makeBuilder({ data: null, error: { message: 'db error' } });
      repo = new SupabaseExecutionRepository(makeClient(builder), logger);

      await expect(repo.savePlan(makePlan())).rejects.toThrow(RepositoryError);
    });
  });

  describe('findPlanById', () => {
    it('returns reconstituted plan when found', async () => {
      const plan = makePlan();
      const row = planToRow(plan);
      const builder = makeBuilder({ data: row, error: null });
      repo = new SupabaseExecutionRepository(makeClient(builder), logger);

      const result = await repo.findPlanById(plan.id);
      expect(result).not.toBeNull();
      expect(result?.id).toBe(plan.id);
    });

    it('returns null when not found', async () => {
      const builder = makeBuilder({ data: null, error: null });
      repo = new SupabaseExecutionRepository(makeClient(builder), logger);

      const result = await repo.findPlanById('nonexistent');
      expect(result).toBeNull();
    });

    it('throws RepositoryError on supabase error', async () => {
      const builder = makeBuilder({ data: null, error: { message: 'db error' } });
      repo = new SupabaseExecutionRepository(makeClient(builder), logger);

      await expect(repo.findPlanById('any')).rejects.toThrow(RepositoryError);
    });
  });

  describe('findAllPlans', () => {
    it('applies status filter', async () => {
      const plan = makePlan();
      const builder = makeBuilder({ data: [planToRow(plan)], error: null });
      repo = new SupabaseExecutionRepository(makeClient(builder), logger);

      const results = await repo.findAllPlans({ status: ExecutionStatus.Pending });
      expect(builder['eq']).toHaveBeenCalledWith('status', ExecutionStatus.Pending);
      expect(results).toHaveLength(1);
    });

    it('applies ownerId filter', async () => {
      const builder = makeBuilder({ data: [], error: null });
      repo = new SupabaseExecutionRepository(makeClient(builder), logger);

      await repo.findAllPlans({ ownerId: 'owner-1' });
      expect(builder['eq']).toHaveBeenCalledWith('owner_id', 'owner-1');
    });

    it('applies limit', async () => {
      const builder = makeBuilder({ data: [], error: null });
      repo = new SupabaseExecutionRepository(makeClient(builder), logger);

      await repo.findAllPlans({ limit: 5 });
      expect(builder['limit']).toHaveBeenCalledWith(5);
    });

    it('throws RepositoryError on error', async () => {
      const builder = makeBuilder({ data: null, error: { message: 'db error' } });
      repo = new SupabaseExecutionRepository(makeClient(builder), logger);
      await expect(repo.findAllPlans()).rejects.toThrow(RepositoryError);
    });
  });

  describe('deletePlan', () => {
    it('calls delete on the correct table', async () => {
      const builder = makeBuilder({ data: null, error: null });
      repo = new SupabaseExecutionRepository(makeClient(builder), logger);

      await repo.deletePlan('plan-id');
      expect(builder['delete']).toHaveBeenCalled();
      expect(builder['eq']).toHaveBeenCalledWith('id', 'plan-id');
    });

    it('throws RepositoryError on error', async () => {
      const builder = makeBuilder({ data: null, error: { message: 'db error' } });
      repo = new SupabaseExecutionRepository(makeClient(builder), logger);
      await expect(repo.deletePlan('id')).rejects.toThrow(RepositoryError);
    });
  });

  describe('saveCheckpoint', () => {
    it('upserts checkpoint and returns reconstituted domain object', async () => {
      const checkpoint = ExecutionCheckpoint.create({
        planId: 'plan-1',
        nodeStatuses: { 'node-1': ExecutionStatus.Succeeded },
        artifacts: [],
      });
      const row = {
        id: checkpoint.id,
        plan_id: checkpoint.planId,
        node_statuses: { 'node-1': ExecutionStatus.Succeeded },
        artifacts: [],
        created_at: checkpoint.createdAt.toISOString(),
      };
      const builder = makeBuilder({ data: row, error: null });
      repo = new SupabaseExecutionRepository(makeClient(builder), logger);

      const result = await repo.saveCheckpoint(checkpoint);
      expect(result.id).toBe(checkpoint.id);
      expect(result.getNodeStatus('node-1')).toBe(ExecutionStatus.Succeeded);
    });

    it('throws RepositoryError on error', async () => {
      const builder = makeBuilder({ data: null, error: { message: 'fail' } });
      repo = new SupabaseExecutionRepository(makeClient(builder), logger);
      const checkpoint = ExecutionCheckpoint.create({ planId: 'p', nodeStatuses: {}, artifacts: [] });
      await expect(repo.saveCheckpoint(checkpoint)).rejects.toThrow(RepositoryError);
    });
  });

  describe('findCheckpointsByPlanId', () => {
    it('returns empty array when none found', async () => {
      const builder = makeBuilder({ data: [], error: null });
      repo = new SupabaseExecutionRepository(makeClient(builder), logger);

      const result = await repo.findCheckpointsByPlanId('plan-1');
      expect(result).toHaveLength(0);
    });

    it('throws RepositoryError on error', async () => {
      const builder = makeBuilder({ data: null, error: { message: 'fail' } });
      repo = new SupabaseExecutionRepository(makeClient(builder), logger);
      await expect(repo.findCheckpointsByPlanId('plan-1')).rejects.toThrow(RepositoryError);
    });
  });

  describe('findLatestCheckpoint', () => {
    it('returns null when not found', async () => {
      const builder = makeBuilder({ data: null, error: null });
      repo = new SupabaseExecutionRepository(makeClient(builder), logger);

      const result = await repo.findLatestCheckpoint('plan-1');
      expect(result).toBeNull();
    });

    it('returns checkpoint when found', async () => {
      const checkpoint = ExecutionCheckpoint.create({
        planId: 'plan-1',
        nodeStatuses: {},
        artifacts: [],
      });
      const row = {
        id: checkpoint.id,
        plan_id: 'plan-1',
        node_statuses: {},
        artifacts: [],
        created_at: checkpoint.createdAt.toISOString(),
      };
      const builder = makeBuilder({ data: row, error: null });
      repo = new SupabaseExecutionRepository(makeClient(builder), logger);

      const result = await repo.findLatestCheckpoint('plan-1');
      expect(result?.id).toBe(checkpoint.id);
    });
  });
});
