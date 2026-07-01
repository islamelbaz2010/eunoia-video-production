import { ExecutionEngine } from '../../../src/execution/orchestration/ExecutionEngine';
import { ExecutionPlan } from '../../../src/execution/domain/models/ExecutionPlan';
import { ExecutionGraph } from '../../../src/execution/domain/models/ExecutionGraph';
import { ExecutionNode } from '../../../src/execution/domain/models/ExecutionNode';
import { ExecutionContext } from '../../../src/execution/domain/models/ExecutionContext';
import { ExecutionEdge } from '../../../src/execution/domain/models/ExecutionEdge';
import { ExecutionStatus } from '../../../src/execution/domain/models/ExecutionStatus';
import { NodeType } from '../../../src/execution/domain/models/NodeType';
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

function makePlanWithNode(node: ExecutionNode): ExecutionPlan {
  const graph = ExecutionGraph.create({ planId: 'plan-1', nodes: [node], edges: [] });
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

describe('ExecutionEngine — retry and edge cases', () => {
  let engine: ExecutionEngine;
  let repository: jest.Mocked<IExecutionRepository>;
  let eventBus: jest.Mocked<IEventBus>;
  let metrics: jest.Mocked<IMetricsService>;
  let logger: jest.Mocked<ILogger>;

  beforeEach(() => {
    repository = makeRepository();
    eventBus = makeEventBus();
    metrics = makeMetrics();
    logger = makeLogger();
    engine = new ExecutionEngine(repository, makeAdapters(), eventBus, metrics, logger);
  });

  it('retries failed nodes when maxRetries > 0', async () => {
    let callCount = 0;
    const failThenSucceed: ExecutionAdapters = {
      ...makeAdapters(),
      imageGenerator: {
        generate: jest.fn().mockImplementation(async () => {
          callCount++;
          if (callCount < 2) throw new Error('transient failure');
          return { url: 'mock://img.png', width: 1920, height: 1080, format: 'png', metadata: {} };
        }),
      },
    };
    const retryEngine = new ExecutionEngine(repository, failThenSucceed, eventBus, metrics, logger);

    const node = ExecutionNode.create({
      planId: 'plan-1',
      type: NodeType.GenerateImage,
      priority: 1,
      config: { style: 'bold', dimensions: { width: 1920, height: 1080 } },
      maxRetries: 2,
      estimatedDurationMs: 100,
      estimatedCost: 0,
      metadata: {},
    });
    const plan = makePlanWithNode(node);

    const result = await retryEngine.execute(plan);
    expect(result.status).toBe(ExecutionStatus.Succeeded);
  });

  it('marks plan as Succeeded with empty graph (no nodes)', async () => {
    const graph = ExecutionGraph.create({ planId: 'plan-1', nodes: [], edges: [] });
    const context = ExecutionContext.create({
      planId: graph.id,
      campaignId: null,
      ownerId: 'owner-1',
      variables: {},
      artifacts: [],
    });
    const emptyPlan = ExecutionPlan.create({
      campaignId: null,
      ownerId: 'owner-1',
      productionPlanId: null,
      graph,
      context,
      estimatedDurationMs: 0,
      estimatedCost: 0,
    });

    const result = await engine.execute(emptyPlan);
    expect(result.status).toBe(ExecutionStatus.Succeeded);
  });

  it('increments jobsFailed metric on failed execution', async () => {
    const failAdapter: ExecutionAdapters = {
      ...makeAdapters(),
      voiceGenerator: {
        generate: jest.fn().mockRejectedValue(new Error('voice API down')),
      },
    };
    const failEngine = new ExecutionEngine(repository, failAdapter, eventBus, metrics, logger);

    const voiceNode = ExecutionNode.create({
      planId: 'plan-1',
      type: NodeType.GenerateVoice,
      priority: 1,
      config: { voiceStyle: 'conversational', tone: 'friendly', pacing: 'medium', language: 'en' },
      maxRetries: 0,
      estimatedDurationMs: 100,
      estimatedCost: 0,
      metadata: {},
    });
    const plan = makePlanWithNode(voiceNode);
    await failEngine.execute(plan);

    expect(metrics.incrementJobsFailed).toHaveBeenCalled();
  });

  it('executes GenerateScript node with scene config', async () => {
    const node = ExecutionNode.create({
      planId: 'plan-1',
      type: NodeType.GenerateScript,
      priority: 1,
      config: {
        scenes: [{ index: 0, title: 'Intro', voiceoverText: 'Hello', durationSeconds: 10 }],
        totalDurationSeconds: 60,
        language: 'en',
        voiceoverStyle: 'conversational',
      },
      maxRetries: 0,
      estimatedDurationMs: 100,
      estimatedCost: 0,
      metadata: {},
    });
    const plan = makePlanWithNode(node);
    const result = await engine.execute(plan);
    expect(result.status).toBe(ExecutionStatus.Succeeded);
  });

  it('executes GenerateImagePrompt node with thumbnail config', async () => {
    const node = ExecutionNode.create({
      planId: 'plan-1',
      type: NodeType.GenerateImagePrompt,
      priority: 1,
      config: {
        thumbnailStyle: 'high_contrast',
        imagePrompt: 'bold red background',
        colorScheme: ['#ff0000'],
        moodKeywords: ['bold'],
      },
      maxRetries: 0,
      estimatedDurationMs: 100,
      estimatedCost: 0,
      metadata: {},
    });
    const plan = makePlanWithNode(node);
    const result = await engine.execute(plan);
    expect(result.status).toBe(ExecutionStatus.Succeeded);
  });

  it('cancels during execution via cancellationTokens', async () => {
    const plan = makePlanWithNode(
      ExecutionNode.create({
        planId: 'plan-1',
        type: NodeType.Notify,
        priority: 1,
        config: {},
        maxRetries: 0,
        estimatedDurationMs: 100,
        estimatedCost: 0,
        metadata: {},
      }),
    );
    repository.findPlanById.mockResolvedValue(plan);

    const cancelResult = await engine.cancel(plan.id, 'test');
    expect(cancelResult.status).toBe(ExecutionStatus.Cancelled);
  });

  it('catches unexpected runGraph errors via execute catch block (lines 69-72)', async () => {
    const node = ExecutionNode.create({
      planId: 'plan-1',
      type: NodeType.GenerateScript,
      priority: 1,
      config: {},
      maxRetries: 0,
      estimatedDurationMs: 100,
      estimatedCost: 0,
      metadata: {},
    });
    const plan = makePlanWithNode(node);

    // Make saveCheckpoint throw inside runGraph so the error propagates to execute's catch
    repository.saveCheckpoint.mockRejectedValueOnce(new Error('storage crash'));
    // savePlan should work for the recovery save in the catch block
    repository.savePlan.mockImplementation(async (p: ExecutionPlan) => p);

    const result = await engine.execute(plan);
    expect(result.status).toBe(ExecutionStatus.Failed);
    expect(logger.error).toHaveBeenCalled();
  });

  it('skips terminal nodes during cancel (line 117)', async () => {
    const terminalNode = ExecutionNode.create({
      planId: 'plan-1',
      type: NodeType.GenerateScript,
      priority: 1,
      config: {},
      maxRetries: 0,
      estimatedDurationMs: 100,
      estimatedCost: 0,
      metadata: {},
    })
      .withStatus(ExecutionStatus.Succeeded); // already terminal

    const pendingNode = ExecutionNode.create({
      planId: 'plan-1',
      type: NodeType.Notify,
      priority: 1,
      config: {},
      maxRetries: 0,
      estimatedDurationMs: 100,
      estimatedCost: 0,
      metadata: {},
    });

    const graph = ExecutionGraph.create({ planId: 'plan-1', nodes: [terminalNode, pendingNode], edges: [] });
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
    repository.findPlanById.mockResolvedValue(plan);

    const result = await engine.cancel(plan.id, 'stop');
    // The terminal node (Succeeded) should remain Succeeded, pending node → Cancelled
    const successedNodes = result.graph.nodes.filter(n => n.status === ExecutionStatus.Succeeded);
    const cancelledNodes = result.graph.nodes.filter(n => n.status === ExecutionStatus.Cancelled);
    expect(successedNodes).toHaveLength(1);
    expect(cancelledNodes).toHaveLength(1);
  });

  it('detects non-retryable failure in multi-node chain (lines 195-196)', async () => {
    const failAdapter: ExecutionAdapters = {
      ...makeAdapters(),
      imageGenerator: {
        generate: jest.fn().mockRejectedValue(new Error('image API down')),
      },
    };
    const failEngine = new ExecutionEngine(repository, failAdapter, eventBus, metrics, logger);

    // Two-node chain: imageNode → notifyNode
    const imageNode = ExecutionNode.create({
      planId: 'plan-1',
      type: NodeType.GenerateImage,
      priority: 1,
      config: {},
      maxRetries: 0, // non-retryable
      estimatedDurationMs: 100,
      estimatedCost: 0,
      metadata: {},
    });
    const notifyNode = ExecutionNode.create({
      planId: 'plan-1',
      type: NodeType.Notify,
      priority: 2,
      config: {},
      maxRetries: 0,
      estimatedDurationMs: 100,
      estimatedCost: 0,
      metadata: {},
    });
    const edge = ExecutionEdge.create({ fromNodeId: imageNode.id, toNodeId: notifyNode.id, condition: 'on_success' });
    const graph = ExecutionGraph.create({ planId: 'plan-1', nodes: [imageNode, notifyNode], edges: [edge] });
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

    const result = await failEngine.execute(plan);
    // imageNode fails → notifyNode still Pending → not complete → nonRetryableFailed path → Failed
    expect(result.status).toBe(ExecutionStatus.Failed);
  });

  it('handles unknown node type via default case in dispatch (line 476)', async () => {
    const unknownNode = ExecutionNode.create({
      planId: 'plan-1',
      type: 'unknown_node_xyz' as NodeType,
      priority: 1,
      config: {},
      maxRetries: 0,
      estimatedDurationMs: 100,
      estimatedCost: 0,
      metadata: {},
    });
    const plan = makePlanWithNode(unknownNode);
    const result = await engine.execute(plan);
    // Unknown type gets skipped → counts as success
    expect(result.status).toBe(ExecutionStatus.Succeeded);
  });

  it('detects cancellation token inside runGraph loop (lines 172-174)', async () => {
    const node = ExecutionNode.create({
      planId: 'plan-1',
      type: NodeType.Notify,
      priority: 1,
      config: {},
      maxRetries: 0,
      estimatedDurationMs: 100,
      estimatedCost: 0,
      metadata: {},
    });
    const plan = makePlanWithNode(node);

    // Pre-seed the cancellation token by calling cancel() before execute()
    // cancel() adds the planId to cancellationTokens, which runGraph checks at loop start
    repository.findPlanById.mockResolvedValue(plan);
    await engine.cancel(plan.id, 'pre-cancel');

    // Now execute() → runGraph() sees the token on the first iteration
    repository.savePlan.mockImplementation(async (p: ExecutionPlan) => p);
    const result = await engine.execute(plan);
    expect(result.status).toBe(ExecutionStatus.Cancelled);
  });
});
