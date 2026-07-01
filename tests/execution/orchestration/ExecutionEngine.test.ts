import { ExecutionEngine } from '../../../src/execution/orchestration/ExecutionEngine';
import { ExecutionPlan } from '../../../src/execution/domain/models/ExecutionPlan';
import { ExecutionGraph } from '../../../src/execution/domain/models/ExecutionGraph';
import { ExecutionNode } from '../../../src/execution/domain/models/ExecutionNode';
import { ExecutionEdge } from '../../../src/execution/domain/models/ExecutionEdge';
import { ExecutionContext } from '../../../src/execution/domain/models/ExecutionContext';
import { ExecutionStatus } from '../../../src/execution/domain/models/ExecutionStatus';
import { NodeType } from '../../../src/execution/domain/models/NodeType';
import { EXECUTION_EVENT_TYPES } from '../../../src/execution/events/ExecutionEvents';
import type { IExecutionRepository } from '../../../src/execution/domain/repositories/IExecutionRepository';
import type { ExecutionAdapters } from '../../../src/execution/orchestration/ExecutionEngine';
import type { IEventBus } from '../../../src/core/events/IEventBus';
import type { IMetricsService } from '../../../src/core/metrics/IMetricsService';
import type { ILogger } from '../../../src/shared/logger/ILogger';
import { MockImageGenerator } from '../../../src/execution/adapters/mock/MockImageGenerator';
import { MockVideoGenerator } from '../../../src/execution/adapters/mock/MockVideoGenerator';
import { MockVoiceGenerator } from '../../../src/execution/adapters/mock/MockVoiceGenerator';
import { MockMusicGenerator } from '../../../src/execution/adapters/mock/MockMusicGenerator';
import { MockVideoAssembler } from '../../../src/execution/adapters/mock/MockVideoAssembler';
import { MockUploader } from '../../../src/execution/adapters/mock/MockUploader';
import { MockPublisher } from '../../../src/execution/adapters/mock/MockPublisher';
import { AppError, NotFoundError } from '../../../src/shared/errors/AppError';

function makeLogger(): jest.Mocked<ILogger> {
  return {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: jest.fn().mockReturnThis(),
  } as unknown as jest.Mocked<ILogger>;
}

function makeEventBus(): jest.Mocked<IEventBus> {
  return {
    publish: jest.fn().mockResolvedValue(undefined),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  };
}

function makeMetrics(): jest.Mocked<IMetricsService> {
  return {
    incrementJobsExecuted: jest.fn(),
    incrementJobsFailed: jest.fn(),
    recordExecutionTime: jest.fn(),
    recordProviderLatency: jest.fn(),
    getSnapshot: jest.fn().mockReturnValue({
      jobsExecuted: 0,
      jobsFailed: 0,
      averageExecutionTimeMs: 0,
      queueLength: 0,
      providerLatency: {},
    }),
  };
}

function makeRepository(): jest.Mocked<IExecutionRepository> {
  return {
    savePlan: jest.fn().mockImplementation(async (p: ExecutionPlan) => p),
    findPlanById: jest.fn(),
    findAllPlans: jest.fn().mockResolvedValue([]),
    deletePlan: jest.fn().mockResolvedValue(undefined),
    saveCheckpoint: jest.fn().mockImplementation(async (c) => c),
    findCheckpointsByPlanId: jest.fn().mockResolvedValue([]),
    findLatestCheckpoint: jest.fn().mockResolvedValue(null),
  };
}

function makeAdapters(): ExecutionAdapters {
  return {
    imageGenerator: new MockImageGenerator(),
    videoGenerator: new MockVideoGenerator(),
    voiceGenerator: new MockVoiceGenerator(),
    musicGenerator: new MockMusicGenerator(),
    videoAssembler: new MockVideoAssembler(),
    uploader: new MockUploader(),
    publisher: new MockPublisher(),
  };
}

function makeNode(type: NodeType, status = ExecutionStatus.Pending): ExecutionNode {
  return ExecutionNode.create({
    planId: 'plan-1',
    type,
    priority: 1,
    config: {},
    maxRetries: 0,
    estimatedDurationMs: 100,
    estimatedCost: 0,
    metadata: {},
  }).withStatus(status);
}

function makeEdge(from: string, to: string): ExecutionEdge {
  return ExecutionEdge.create({ fromNodeId: from, toNodeId: to, condition: 'on_success' });
}

function makePlan(nodes: ExecutionNode[], edges: ExecutionEdge[] = []): ExecutionPlan {
  const graph = ExecutionGraph.create({ planId: 'plan-1', nodes, edges });
  const context = ExecutionContext.create({
    planId: graph.id,
    campaignId: null,
    ownerId: 'owner-1',
    variables: {},
    artifacts: [],
  });
  return ExecutionPlan.create({
    campaignId: null,
    ownerId: 'owner-1',
    productionPlanId: null,
    graph,
    context,
    estimatedDurationMs: 60000,
    estimatedCost: 1.0,
  });
}

describe('ExecutionEngine', () => {
  let engine: ExecutionEngine;
  let repository: jest.Mocked<IExecutionRepository>;
  let eventBus: jest.Mocked<IEventBus>;
  let metrics: jest.Mocked<IMetricsService>;
  let logger: jest.Mocked<ILogger>;
  let adapters: ExecutionAdapters;

  beforeEach(() => {
    repository = makeRepository();
    eventBus = makeEventBus();
    metrics = makeMetrics();
    logger = makeLogger();
    adapters = makeAdapters();
    engine = new ExecutionEngine(repository, adapters, eventBus, metrics, logger);
  });

  describe('execute', () => {
    it('executes a single-node graph to Succeeded', async () => {
      const node = makeNode(NodeType.GenerateScript);
      const plan = makePlan([node]);

      const result = await engine.execute(plan);

      expect(result.status).toBe(ExecutionStatus.Succeeded);
      expect(result.graph.succeededNodeCount()).toBe(1);
    });

    it('executes a two-node chain A -> B', async () => {
      const a = makeNode(NodeType.GenerateScript);
      const b = makeNode(NodeType.GenerateVoice);
      const plan = makePlan([a, b], [makeEdge(a.id, b.id)]);

      const result = await engine.execute(plan);

      expect(result.status).toBe(ExecutionStatus.Succeeded);
      expect(result.graph.succeededNodeCount()).toBe(2);
    });

    it('publishes ExecutionStarted event', async () => {
      const plan = makePlan([makeNode(NodeType.Notify)]);
      await engine.execute(plan);

      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: EXECUTION_EVENT_TYPES.Started }),
      );
    });

    it('publishes ExecutionFinished event', async () => {
      const plan = makePlan([makeNode(NodeType.Notify)]);
      await engine.execute(plan);

      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: EXECUTION_EVENT_TYPES.Finished }),
      );
    });

    it('records execution time in metrics', async () => {
      const plan = makePlan([makeNode(NodeType.Notify)]);
      await engine.execute(plan);
      expect(metrics.recordExecutionTime).toHaveBeenCalledTimes(1);
    });

    it('increments jobsExecuted metric on success', async () => {
      const plan = makePlan([makeNode(NodeType.Notify)]);
      await engine.execute(plan);
      expect(metrics.incrementJobsExecuted).toHaveBeenCalledTimes(1);
    });

    it('saves plan to repository on completion', async () => {
      const plan = makePlan([makeNode(NodeType.Notify)]);
      await engine.execute(plan);
      expect(repository.savePlan).toHaveBeenCalled();
    });

    it('executes all node types without error', async () => {
      const nodes = [
        makeNode(NodeType.GenerateScript),
        makeNode(NodeType.GenerateImagePrompt),
        makeNode(NodeType.GenerateImage),
        makeNode(NodeType.AnimateImage),
        makeNode(NodeType.GenerateVoice),
        makeNode(NodeType.GenerateMusic),
        makeNode(NodeType.AssembleVideo),
        makeNode(NodeType.UploadAsset),
        makeNode(NodeType.PublishContent),
        makeNode(NodeType.Notify),
        makeNode(NodeType.CustomPlugin),
      ];
      const plan = makePlan(nodes);
      const result = await engine.execute(plan);
      expect(result.status).toBe(ExecutionStatus.Succeeded);
    });

    it('fails the plan when a non-retryable node fails', async () => {
      const failingAdapter: ExecutionAdapters = {
        ...adapters,
        imageGenerator: {
          generate: jest.fn().mockRejectedValue(new Error('image API error')),
        },
      };
      const failEngine = new ExecutionEngine(repository, failingAdapter, eventBus, metrics, logger);

      const imageNode = ExecutionNode.create({
        planId: 'plan-1',
        type: NodeType.GenerateImage,
        priority: 1,
        config: { style: 'bold', dimensions: { width: 1920, height: 1080 } },
        maxRetries: 0,
        estimatedDurationMs: 100,
        estimatedCost: 0,
        metadata: {},
      });
      const plan = makePlan([imageNode]);

      const result = await failEngine.execute(plan);
      expect(result.status).toBe(ExecutionStatus.Failed);
      expect(metrics.incrementJobsFailed).toHaveBeenCalled();
    });

    it('checkpoints progress during execution', async () => {
      const a = makeNode(NodeType.GenerateScript);
      const b = makeNode(NodeType.Notify);
      const plan = makePlan([a, b], [makeEdge(a.id, b.id)]);

      await engine.execute(plan);
      expect(repository.saveCheckpoint).toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('cancels a non-terminal plan', async () => {
      const plan = makePlan([makeNode(NodeType.GenerateScript)]);
      repository.findPlanById.mockResolvedValue(plan);

      const result = await engine.cancel(plan.id, 'user requested');

      expect(result.status).toBe(ExecutionStatus.Cancelled);
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: EXECUTION_EVENT_TYPES.Cancelled }),
      );
    });

    it('throws NotFoundError when plan not found', async () => {
      repository.findPlanById.mockResolvedValue(null);
      await expect(engine.cancel('unknown-id')).rejects.toThrow(NotFoundError);
    });

    it('throws AppError when plan is already terminal', async () => {
      const plan = makePlan([makeNode(NodeType.Notify)]).withCompletedAt(
        new Date(),
        ExecutionStatus.Succeeded,
      );
      repository.findPlanById.mockResolvedValue(plan);
      await expect(engine.cancel(plan.id)).rejects.toThrow(AppError);
    });

    it('marks all non-terminal nodes as Cancelled', async () => {
      const node = makeNode(NodeType.GenerateScript);
      const plan = makePlan([node]);
      repository.findPlanById.mockResolvedValue(plan);

      const result = await engine.cancel(plan.id);
      const cancelledNodes = result.graph.nodes.filter(
        n => n.status === ExecutionStatus.Cancelled,
      );
      expect(cancelledNodes).toHaveLength(1);
    });
  });

  describe('resume', () => {
    it('throws AppError when plan is not in Failed status', async () => {
      const plan = makePlan([makeNode(NodeType.Notify)]).withCompletedAt(new Date(), ExecutionStatus.Succeeded);
      repository.findPlanById.mockResolvedValue(plan);
      await expect(engine.resume(plan.id)).rejects.toThrow(AppError);
    });

    it('throws NotFoundError when plan not found', async () => {
      repository.findPlanById.mockResolvedValue(null);
      await expect(engine.resume('missing-id')).rejects.toThrow(NotFoundError);
    });

    it('publishes Resumed event and re-executes from paused state', async () => {
      const node = makeNode(NodeType.Notify);
      const plan = makePlan([node]).withCompletedAt(new Date(), ExecutionStatus.Failed);
      repository.findPlanById.mockResolvedValue(plan);
      repository.savePlan.mockImplementation(async (p: ExecutionPlan) => p);

      await engine.resume(plan.id);

      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: EXECUTION_EVENT_TYPES.Resumed }),
      );
    });
  });
});
