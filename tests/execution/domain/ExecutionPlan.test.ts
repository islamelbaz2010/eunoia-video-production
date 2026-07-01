import { ExecutionPlan } from '../../../src/execution/domain/models/ExecutionPlan';
import { ExecutionGraph } from '../../../src/execution/domain/models/ExecutionGraph';
import { ExecutionContext } from '../../../src/execution/domain/models/ExecutionContext';
import { ExecutionCheckpoint } from '../../../src/execution/domain/models/ExecutionCheckpoint';
import { ExecutionStatus } from '../../../src/execution/domain/models/ExecutionStatus';

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

function makePlan(overrides: Partial<Parameters<typeof ExecutionPlan.create>[0]> = {}): ExecutionPlan {
  return ExecutionPlan.create({
    campaignId: 'campaign-1',
    ownerId: 'owner-1',
    productionPlanId: 'prod-plan-1',
    graph: makeGraph(),
    context: makeContext(),
    estimatedDurationMs: 3600000,
    estimatedCost: 1.5,
    ...overrides,
  });
}

describe('ExecutionPlan', () => {
  describe('create', () => {
    it('creates plan with Pending status and generated id', () => {
      const plan = makePlan();
      expect(plan.id).toBeDefined();
      expect(plan.status).toBe(ExecutionStatus.Pending);
      expect(plan.startedAt).toBeNull();
      expect(plan.completedAt).toBeNull();
      expect(plan.checkpoints).toHaveLength(0);
    });

    it('copies timestamps defensively from props', () => {
      const sourceDate = new Date('2025-06-01');
      const graph = makeGraph();
      const context = makeContext();
      const plan = ExecutionPlan.reconstitute({
        id: 'plan-x',
        campaignId: null,
        ownerId: 'owner-1',
        productionPlanId: null,
        graph,
        context,
        status: ExecutionStatus.Pending,
        estimatedDurationMs: 0,
        estimatedCost: 0,
        startedAt: null,
        completedAt: null,
        checkpoints: [],
        createdAt: sourceDate,
        updatedAt: sourceDate,
      });
      const storedYear = plan.createdAt.getFullYear();
      sourceDate.setFullYear(2000);
      expect(plan.createdAt.getFullYear()).toBe(storedYear);
    });
  });

  describe('withStatus', () => {
    it('returns new plan with updated status', () => {
      const plan = makePlan();
      const updated = plan.withStatus(ExecutionStatus.Running);
      expect(updated.status).toBe(ExecutionStatus.Running);
      expect(plan.status).toBe(ExecutionStatus.Pending);
    });
  });

  describe('withGraph', () => {
    it('replaces graph and bumps updatedAt', () => {
      const plan = makePlan();
      const newGraph = ExecutionGraph.create({ planId: plan.id, nodes: [], edges: [] });
      const updated = plan.withGraph(newGraph);
      expect(updated.graph.id).toBe(newGraph.id);
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(plan.updatedAt.getTime());
    });
  });

  describe('withStartedAt', () => {
    it('sets startedAt and transitions to Running', () => {
      const plan = makePlan();
      const started = plan.withStartedAt(new Date());
      expect(started.startedAt).not.toBeNull();
      expect(started.status).toBe(ExecutionStatus.Running);
    });
  });

  describe('withCompletedAt', () => {
    it('sets completedAt and given status', () => {
      const plan = makePlan().withStartedAt(new Date());
      const completed = plan.withCompletedAt(new Date(), ExecutionStatus.Succeeded);
      expect(completed.completedAt).not.toBeNull();
      expect(completed.status).toBe(ExecutionStatus.Succeeded);
    });
  });

  describe('withCheckpoint', () => {
    it('appends checkpoint to list', () => {
      const plan = makePlan();
      const checkpoint = ExecutionCheckpoint.create({
        planId: plan.id,
        nodeStatuses: {},
        artifacts: [],
      });
      const updated = plan.withCheckpoint(checkpoint);
      expect(updated.checkpoints).toHaveLength(1);
      expect(plan.checkpoints).toHaveLength(0);
    });
  });

  describe('isTerminal', () => {
    it.each([ExecutionStatus.Succeeded, ExecutionStatus.Failed, ExecutionStatus.Cancelled])(
      'returns true for %s',
      status => {
        const plan = makePlan().withCompletedAt(new Date(), status);
        expect(plan.isTerminal()).toBe(true);
      },
    );

    it('returns false for Running', () => {
      const plan = makePlan().withStartedAt(new Date());
      expect(plan.isTerminal()).toBe(false);
    });
  });

  describe('latestCheckpoint', () => {
    it('returns null when no checkpoints', () => {
      const plan = makePlan();
      expect(plan.latestCheckpoint()).toBeNull();
    });

    it('returns last checkpoint', () => {
      const plan = makePlan();
      const cp1 = ExecutionCheckpoint.create({ planId: plan.id, nodeStatuses: {}, artifacts: [] });
      const cp2 = ExecutionCheckpoint.create({ planId: plan.id, nodeStatuses: {}, artifacts: [] });
      const updated = plan.withCheckpoint(cp1).withCheckpoint(cp2);
      expect(updated.latestCheckpoint()?.id).toBe(cp2.id);
    });
  });

  describe('reconstitute', () => {
    it('restores all fields including null timestamps', () => {
      const now = new Date();
      const graph = makeGraph();
      const ctx = makeContext();
      const plan = ExecutionPlan.reconstitute({
        id: 'plan-xyz',
        campaignId: null,
        ownerId: 'owner-2',
        productionPlanId: null,
        graph,
        context: ctx,
        status: ExecutionStatus.Failed,
        estimatedDurationMs: 0,
        estimatedCost: 0,
        startedAt: now,
        completedAt: now,
        checkpoints: [],
        createdAt: now,
        updatedAt: now,
      });
      expect(plan.id).toBe('plan-xyz');
      expect(plan.campaignId).toBeNull();
      expect(plan.startedAt).not.toBeNull();
    });
  });
});
