import { ExecutionService } from '../../../src/execution/application/ExecutionService';
import { ExecutionPlan } from '../../../src/execution/domain/models/ExecutionPlan';
import { ExecutionGraph } from '../../../src/execution/domain/models/ExecutionGraph';
import { ExecutionContext } from '../../../src/execution/domain/models/ExecutionContext';
import { ExecutionStatus } from '../../../src/execution/domain/models/ExecutionStatus';
import { NodeType } from '../../../src/execution/domain/models/NodeType';
import { ExecutionNode } from '../../../src/execution/domain/models/ExecutionNode';
import { ProductionPlan } from '../../../src/creative/domain/models/ProductionPlan';
import { ScriptPlan } from '../../../src/creative/domain/models/ScriptPlan';
import { ThumbnailPlan } from '../../../src/creative/domain/models/ThumbnailPlan';
import { VoicePlan } from '../../../src/creative/domain/models/VoicePlan';
import { MusicPlan } from '../../../src/creative/domain/models/MusicPlan';
import { PlatformPlan } from '../../../src/creative/domain/models/PlatformPlan';
import type { ExecutionEngine } from '../../../src/execution/orchestration/ExecutionEngine';
import type { ExecutionPlanner } from '../../../src/execution/planning/ExecutionPlanner';
import type { ExecutionValidator } from '../../../src/execution/validation/ExecutionValidator';
import type { IExecutionRepository } from '../../../src/execution/domain/repositories/IExecutionRepository';
import type { ILogger } from '../../../src/shared/logger/ILogger';
import { NotFoundError, AppError } from '../../../src/shared/errors/AppError';
import {
  VoiceStyle,
  ThumbnailStyle,
  MusicMood,
  Platform,
  ContentType,
  VideoLength,
} from '../../../src/creative';

function makeLogger(): jest.Mocked<ILogger> {
  return {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: jest.fn().mockReturnThis(),
  } as unknown as jest.Mocked<ILogger>;
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

function makeMockEngine(): jest.Mocked<ExecutionEngine> {
  return {
    execute: jest.fn(),
    cancel: jest.fn(),
    resume: jest.fn(),
  } as unknown as jest.Mocked<ExecutionEngine>;
}

function makeGraph(): ExecutionGraph {
  const node = ExecutionNode.create({
    planId: 'plan-1',
    type: NodeType.Notify,
    priority: 1,
    config: {},
    maxRetries: 0,
    estimatedDurationMs: 1000,
    estimatedCost: 0,
    metadata: {},
  });
  return ExecutionGraph.create({ planId: 'plan-1', nodes: [node], edges: [] });
}

function makeMockPlanner(): jest.Mocked<ExecutionPlanner> {
  const graph = makeGraph();
  const context = ExecutionContext.create({
    planId: graph.id,
    campaignId: null,
    ownerId: 'owner-1',
    variables: {},
    artifacts: [],
  });
  return {
    plan: jest.fn().mockReturnValue({
      graph,
      context,
      estimatedDurationMs: 60000,
      estimatedCost: 1.0,
    }),
  } as unknown as jest.Mocked<ExecutionPlanner>;
}

function makeMockValidator(valid = true): jest.Mocked<ExecutionValidator> {
  return {
    validate: jest.fn().mockReturnValue({ valid, errors: valid ? [] : [{ code: 'CYCLE_DETECTED', message: 'cycle' }] }),
  } as unknown as jest.Mocked<ExecutionValidator>;
}

function makeProductionPlan(): ProductionPlan {
  return ProductionPlan.create({
    scriptPlan: ScriptPlan.create({
      scenes: [],
      totalDurationSeconds: 60,
      language: 'en',
      voiceoverStyle: VoiceStyle.Conversational,
    }),
    thumbnailPlan: ThumbnailPlan.create({
      style: ThumbnailStyle.HighContrast,
      textOverlay: 'Test',
      colorScheme: ['#fff'],
      composition: 'centered',
      imagePrompt: 'test prompt',
      moodKeywords: ['bold'],
    }),
    voicePlan: VoicePlan.create({
      voiceStyle: VoiceStyle.Conversational,
      tone: 'friendly',
      pacing: 'medium',
      language: 'en',
      accent: null,
    }),
    musicPlan: MusicPlan.create({
      mood: MusicMood.Calm,
      tempoBpm: 90,
      genre: 'ambient',
      durationSeconds: 60,
      energyLevel: 40,
    }),
    platformPlans: [
      PlatformPlan.create({
        platform: Platform.YouTube,
        contentType: ContentType.LongFormVideo,
        videoLength: VideoLength.Medium3m,
        publishingPriority: 1,
        adaptations: [],
      }),
    ],
    estimatedProductionDays: 2,
    productionOrder: ['script', 'image'],
  });
}

function makePlan(): ExecutionPlan {
  const graph = makeGraph();
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

describe('ExecutionService', () => {
  let service: ExecutionService;
  let engine: jest.Mocked<ExecutionEngine>;
  let planner: jest.Mocked<ExecutionPlanner>;
  let validator: jest.Mocked<ExecutionValidator>;
  let repository: jest.Mocked<IExecutionRepository>;
  let logger: jest.Mocked<ILogger>;

  beforeEach(() => {
    engine = makeMockEngine();
    planner = makeMockPlanner();
    validator = makeMockValidator(true);
    repository = makeRepository();
    logger = makeLogger();
    service = new ExecutionService(engine, planner, validator, repository, logger);
  });

  describe('execute', () => {
    it('calls planner, validator, saves plan, and calls engine.execute', async () => {
      const completedPlan = makePlan().withCompletedAt(new Date(), ExecutionStatus.Succeeded);
      engine.execute.mockResolvedValue(completedPlan);

      const result = await service.execute({
        productionPlan: makeProductionPlan(),
        campaignId: null,
        ownerId: 'owner-1',
        productionPlanId: null,
      });

      expect(planner.plan).toHaveBeenCalledTimes(1);
      expect(validator.validate).toHaveBeenCalledTimes(1);
      expect(repository.savePlan).toHaveBeenCalledTimes(1);
      expect(engine.execute).toHaveBeenCalledTimes(1);
      expect(result.status).toBe(ExecutionStatus.Succeeded);
    });

    it('throws AppError when validation fails', async () => {
      const failValidator = makeMockValidator(false);
      const failService = new ExecutionService(engine, planner, failValidator, repository, logger);

      await expect(
        failService.execute({
          productionPlan: makeProductionPlan(),
          campaignId: null,
          ownerId: 'owner-1',
          productionPlanId: null,
        }),
      ).rejects.toThrow(AppError);
    });
  });

  describe('cancel', () => {
    it('delegates to engine.cancel', async () => {
      const plan = makePlan().withCompletedAt(new Date(), ExecutionStatus.Cancelled);
      engine.cancel.mockResolvedValue(plan);

      const result = await service.cancel(plan.id, 'user request');
      expect(engine.cancel).toHaveBeenCalledWith(plan.id, 'user request');
      expect(result.status).toBe(ExecutionStatus.Cancelled);
    });
  });

  describe('resume', () => {
    it('delegates to engine.resume', async () => {
      const plan = makePlan().withCompletedAt(new Date(), ExecutionStatus.Succeeded);
      engine.resume.mockResolvedValue(plan);

      const result = await service.resume(plan.id);
      expect(engine.resume).toHaveBeenCalledWith(plan.id);
      expect(result.status).toBe(ExecutionStatus.Succeeded);
    });
  });

  describe('getPlan', () => {
    it('returns plan when found', async () => {
      const plan = makePlan();
      repository.findPlanById.mockResolvedValue(plan);

      const result = await service.getPlan(plan.id);
      expect(result).toBe(plan);
    });

    it('throws NotFoundError when plan does not exist', async () => {
      repository.findPlanById.mockResolvedValue(null);
      await expect(service.getPlan('unknown')).rejects.toThrow(NotFoundError);
    });
  });

  describe('listPlans', () => {
    it('delegates to repository.findAllPlans with filter', async () => {
      const plans = [makePlan()];
      repository.findAllPlans.mockResolvedValue(plans);

      const result = await service.listPlans({ status: ExecutionStatus.Running });
      expect(repository.findAllPlans).toHaveBeenCalledWith({ status: ExecutionStatus.Running });
      expect(result).toBe(plans);
    });

    it('returns empty array when no plans', async () => {
      repository.findAllPlans.mockResolvedValue([]);
      const result = await service.listPlans();
      expect(result).toHaveLength(0);
    });
  });
});
