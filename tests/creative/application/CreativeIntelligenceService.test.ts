import { CreativeIntelligenceService } from '../../../src/creative/application/CreativeIntelligenceService';
import { StrategySelector } from '../../../src/creative/strategy/StrategySelector';
import { PromptBuilder } from '../../../src/creative/prompts/PromptBuilder';
import { ProductionPlanner } from '../../../src/creative/planning/ProductionPlanner';
import { CreativePlan, CreativePlanStatus } from '../../../src/creative/domain/models/CreativePlan';
import { ICreativeRepository } from '../../../src/creative/domain/repositories/ICreativeRepository';
import { IEventBus } from '../../../src/core/events/IEventBus';
import { IMetricsService } from '../../../src/core/metrics/IMetricsService';
import { ILogger } from '../../../src/shared/logger/ILogger';
import { Campaign, CampaignStatus, CampaignPriority, CampaignType } from '../../../src/campaign/domain/models/Campaign';
import { CampaignGoal, CampaignGoalType } from '../../../src/campaign/domain/models/CampaignGoal';
import { CampaignBudget } from '../../../src/campaign/domain/models/CampaignBudget';
import { CampaignTarget } from '../../../src/campaign/domain/models/CampaignTarget';
import { CampaignMetrics } from '../../../src/campaign/domain/models/CampaignMetrics';
import { CampaignAudience } from '../../../src/campaign/domain/models/CampaignAudience';
import { CampaignLifecycle } from '../../../src/campaign/domain/models/CampaignLifecycle';
import { Platform } from '../../../src/creative/domain/types';
import { NotFoundError } from '../../../src/shared/errors/AppError';

function makeCampaign(): Campaign {
  return Campaign.reconstitute({
    id: 'campaign-1',
    name: 'How to Build SaaS',
    description: 'A campaign about building SaaS products',
    type: CampaignType.Content,
    status: CampaignStatus.Approved,
    priority: CampaignPriority.High,
    ownerId: 'user-1',
    goal: CampaignGoal.create({
      goalType: CampaignGoalType.Revenue,
      description: 'Start your free trial',
      targetValue: 100000,
      currentValue: 0,
      achievedAt: null,
    }),
    budget: CampaignBudget.create({ allocated: 5000, spent: 0, currency: 'USD' }),
    target: CampaignTarget.create({
      expectedRevenue: 100000,
      expectedROI: 200,
      expectedViews: 50000,
      expectedLeads: 500,
      expectedSubscribers: 1000,
      deadline: new Date('2026-12-31'),
    }),
    metrics: CampaignMetrics.empty(),
    audience: CampaignAudience.create({
      segments: ['developers', 'entrepreneurs'],
      demographics: {},
      estimatedSize: 50000,
      targetAge: null,
    }),
    channels: [],
    lifecycle: CampaignLifecycle.empty(),
    tags: ['saas', 'startup'],
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function makeRepo(savedPlan?: CreativePlan): jest.Mocked<ICreativeRepository> {
  return {
    save: jest.fn().mockImplementation((p: CreativePlan) => Promise.resolve(p)),
    findById: jest.fn().mockResolvedValue(savedPlan ?? null),
    findByCampaignId: jest.fn().mockResolvedValue([]),
    findAll: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockImplementation((id: string, patch: any) => Promise.resolve(savedPlan ?? null)),
    delete: jest.fn().mockResolvedValue(undefined),
    count: jest.fn().mockResolvedValue(0),
  };
}

function makeEventBus(): jest.Mocked<IEventBus> {
  return { publish: jest.fn(), subscribe: jest.fn(), unsubscribe: jest.fn() };
}

function makeMetrics(): jest.Mocked<IMetricsService> {
  return {
    incrementJobsExecuted: jest.fn(),
    incrementJobsFailed: jest.fn(),
    recordExecutionTime: jest.fn(),
    recordProviderLatency: jest.fn(),
    getSnapshot: jest.fn().mockReturnValue({ jobsExecuted: 0, jobsFailed: 0 }),
  };
}

function makeLogger(): jest.Mocked<ILogger> {
  const logger: any = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() };
  logger.child = jest.fn().mockReturnValue(logger);
  return logger;
}

function buildService(repo?: jest.Mocked<ICreativeRepository>, bus?: jest.Mocked<IEventBus>) {
  const r = repo ?? makeRepo();
  const b = bus ?? makeEventBus();
  const svc = new CreativeIntelligenceService(
    r,
    new StrategySelector(),
    new PromptBuilder(),
    new ProductionPlanner(),
    b,
    makeMetrics(),
    makeLogger(),
  );
  return { svc, repo: r, bus: b };
}

describe('CreativeIntelligenceService.generateCreativePlan()', () => {
  it('returns a CreativePlan in Draft status', async () => {
    const { svc } = buildService();
    const plan = await svc.generateCreativePlan({ campaign: makeCampaign(), primaryPlatform: Platform.YouTube });
    expect(plan.status).toBe(CreativePlanStatus.Draft);
  });

  it('plan campaignId matches campaign.id', async () => {
    const { svc } = buildService();
    const plan = await svc.generateCreativePlan({ campaign: makeCampaign(), primaryPlatform: Platform.YouTube });
    expect(plan.campaignId).toBe('campaign-1');
  });

  it('saves plan to repository', async () => {
    const { svc, repo } = buildService();
    await svc.generateCreativePlan({ campaign: makeCampaign(), primaryPlatform: Platform.YouTube });
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it('publishes 3 events (plan, prompts, production)', async () => {
    const bus = makeEventBus();
    const { svc } = buildService(undefined, bus);
    await svc.generateCreativePlan({ campaign: makeCampaign(), primaryPlatform: Platform.YouTube });
    expect(bus.publish).toHaveBeenCalledTimes(3);
  });

  it('plan has non-null promptPackage', async () => {
    const { svc } = buildService();
    const plan = await svc.generateCreativePlan({ campaign: makeCampaign(), primaryPlatform: Platform.YouTube });
    expect(plan.promptPackage).not.toBeNull();
  });

  it('plan has non-null productionPlan', async () => {
    const { svc } = buildService();
    const plan = await svc.generateCreativePlan({ campaign: makeCampaign(), primaryPlatform: Platform.YouTube });
    expect(plan.productionPlan).not.toBeNull();
  });

  it('plan has non-null strategy', async () => {
    const { svc } = buildService();
    const plan = await svc.generateCreativePlan({ campaign: makeCampaign(), primaryPlatform: Platform.YouTube });
    expect(plan.strategy).not.toBeNull();
  });

  it('investmentDecisionId is null when not provided', async () => {
    const { svc } = buildService();
    const plan = await svc.generateCreativePlan({ campaign: makeCampaign(), primaryPlatform: Platform.YouTube });
    expect(plan.investmentDecisionId).toBeNull();
  });

  it('works for TikTok primary platform', async () => {
    const { svc } = buildService();
    const plan = await svc.generateCreativePlan({ campaign: makeCampaign(), primaryPlatform: Platform.TikTok });
    expect(plan.status).toBe(CreativePlanStatus.Draft);
  });

  it('works for LinkedIn primary platform', async () => {
    const { svc } = buildService();
    const plan = await svc.generateCreativePlan({ campaign: makeCampaign(), primaryPlatform: Platform.LinkedIn });
    expect(plan.status).toBe(CreativePlanStatus.Draft);
  });
});

describe('CreativeIntelligenceService.approvePlan()', () => {
  it('transitions plan to Approved', async () => {
    const { svc: genSvc } = buildService();
    const draft = await genSvc.generateCreativePlan({ campaign: makeCampaign(), primaryPlatform: Platform.YouTube });

    const repo = makeRepo(draft);
    const { svc } = buildService(repo);
    const approved = await svc.approvePlan(draft.id);
    expect(approved.status).toBe(CreativePlanStatus.Approved);
  });

  it('throws NotFoundError when plan not found', async () => {
    const { svc } = buildService();
    await expect(svc.approvePlan('nonexistent')).rejects.toThrow(NotFoundError);
  });
});

describe('CreativeIntelligenceService.rejectPlan()', () => {
  it('transitions plan to Rejected with reason', async () => {
    const { svc: genSvc } = buildService();
    const draft = await genSvc.generateCreativePlan({ campaign: makeCampaign(), primaryPlatform: Platform.YouTube });

    const repo = makeRepo(draft);
    const { svc } = buildService(repo);
    const rejected = await svc.rejectPlan(draft.id, 'Too expensive');
    expect(rejected.status).toBe(CreativePlanStatus.Rejected);
    expect(rejected.rejectionReason).toBe('Too expensive');
  });

  it('throws NotFoundError when plan not found', async () => {
    const { svc } = buildService();
    await expect(svc.rejectPlan('nonexistent', 'reason')).rejects.toThrow(NotFoundError);
  });
});

describe('CreativeIntelligenceService.chooseStrategy()', () => {
  it('returns a CreativeStrategy with valid strategyType', () => {
    const { svc } = buildService();
    const strategy = svc.chooseStrategy(makeCampaign(), 'education' as any, Platform.YouTube);
    expect(strategy.strategyType).toBeDefined();
  });
});

describe('CreativeIntelligenceService.generateProductionPlan()', () => {
  it('returns a ProductionPlan with at least one platform plan', async () => {
    const { svc } = buildService();
    const campaign = makeCampaign();
    const strategy = svc.chooseStrategy(campaign, 'education' as any, Platform.YouTube);
    const selector = new StrategySelector();
    const brief = selector.resolveContentTypeAndLength('education' as any, Platform.YouTube);
    const plan = svc.generateProductionPlan(
      { topic: 'test', goal: 'education' as any, primaryPlatform: Platform.YouTube, additionalPlatforms: [], targetAudience: 'devs', keyMessages: [], tone: 'pro', callToAction: 'sub', keywords: [], campaignType: CampaignType.Content } as any,
      strategy,
      brief,
    );
    expect(plan.targetPlatformCount()).toBeGreaterThan(0);
  });
});

describe('CreativeIntelligenceService.optimizeForPlatform()', () => {
  it('throws NotFoundError when plan not found', async () => {
    const { svc } = buildService();
    await expect(svc.optimizeForPlatform('nonexistent', Platform.TikTok)).rejects.toThrow(NotFoundError);
  });

  it('returns an updated plan for a known plan', async () => {
    const { svc: genSvc } = buildService();
    const draft = await genSvc.generateCreativePlan({ campaign: makeCampaign(), primaryPlatform: Platform.YouTube });

    const repo = makeRepo(draft);
    const { svc } = buildService(repo);
    const updated = await svc.optimizeForPlatform(draft.id, Platform.TikTok);
    expect(updated.id).toBe(draft.id);
  });
});
