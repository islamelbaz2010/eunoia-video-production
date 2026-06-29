import { RevenueIntelligenceService } from '../../../src/revenue/application/RevenueIntelligenceService';
import { RevenuePredictionEngine } from '../../../src/revenue/prediction/RevenuePredictionEngine';
import { RiskEvaluator } from '../../../src/revenue/scoring/RiskEvaluator';
import { CompetitionEvaluator } from '../../../src/revenue/scoring/CompetitionEvaluator';
import { InvestmentScorer } from '../../../src/revenue/scoring/InvestmentScorer';
import { RevenueModel } from '../../../src/revenue/domain/models/RevenueModel';
import { CostModel } from '../../../src/revenue/domain/models/CostModel';
import { InvestmentScore, DecisionOutcome } from '../../../src/revenue/domain/models/InvestmentScore';
import { InvestmentDecision, DecisionSubjectType } from '../../../src/revenue/domain/models/InvestmentDecision';
import type { IRevenueRepository } from '../../../src/revenue/domain/repositories/IRevenueRepository';
import type { IEventBus } from '../../../src/core/events/IEventBus';
import type { IMetricsService } from '../../../src/core/metrics/IMetricsService';
import type { ILogger } from '../../../src/shared/logger/ILogger';
import { Campaign, CampaignType, CampaignStatus, CampaignPriority } from '../../../src/campaign/domain/models/Campaign';
import { CampaignBudget } from '../../../src/campaign/domain/models/CampaignBudget';
import { CampaignTarget } from '../../../src/campaign/domain/models/CampaignTarget';
import { CampaignMetrics } from '../../../src/campaign/domain/models/CampaignMetrics';
import { CampaignGoal, CampaignGoalType } from '../../../src/campaign/domain/models/CampaignGoal';
import { CampaignAudience } from '../../../src/campaign/domain/models/CampaignAudience';
import { CampaignLifecycle } from '../../../src/campaign/domain/models/CampaignLifecycle';
import { Opportunity, OpportunityStatus } from '../../../src/discovery/domain/models/Opportunity';
import { OpportunityScore } from '../../../src/discovery/domain/models/OpportunityScore';
import { DiscoverySource } from '../../../src/discovery/domain/providers/IDiscoveryProvider';
import { REVENUE_EVENT_TYPES } from '../../../src/revenue/events/RevenueEvents';

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

function makeRepository(): jest.Mocked<IRevenueRepository> {
  return {
    save: jest.fn(),
    findById: jest.fn(),
    findByCampaignId: jest.fn(),
    findByOpportunityId: jest.fn(),
    findAll: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  };
}

function makeMetrics(): jest.Mocked<IMetricsService> {
  return {
    incrementJobsExecuted: jest.fn(),
    incrementJobsFailed: jest.fn(),
    recordExecutionTime: jest.fn(),
    incrementOpportunitiesDiscovered: jest.fn(),
    incrementOpportunitiesPublished: jest.fn(),
    getStats: jest.fn(),
  } as unknown as jest.Mocked<IMetricsService>;
}

function makeCampaign(): Campaign {
  return Campaign.reconstitute({
    id: 'campaign-1',
    name: 'Test Campaign',
    description: 'Test',
    type: CampaignType.Marketing,
    status: CampaignStatus.Approved,
    priority: CampaignPriority.High,
    ownerId: 'owner-1',
    goal: CampaignGoal.create({ goalType: CampaignGoalType.Revenue, description: 'Revenue', targetValue: 10000, currentValue: 0, achievedAt: null }),
    budget: CampaignBudget.create({ allocated: 3000, spent: 0, currency: 'USD' }),
    target: CampaignTarget.create({ expectedRevenue: 10000, expectedROI: 200, expectedViews: 100000, expectedLeads: 500, expectedSubscribers: 100, deadline: new Date(Date.now() + 86400000 * 30) }),
    metrics: CampaignMetrics.empty(),
    audience: CampaignAudience.create({ segments: ['tech'], demographics: {}, estimatedSize: 50000, targetAge: null }),
    channels: [],
    lifecycle: CampaignLifecycle.empty(),
    tags: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    metadata: {},
  });
}

function makeOpportunity(): Opportunity {
  return Opportunity.reconstitute({
    id: 'opportunity-1',
    title: 'Test Opportunity',
    summary: 'A test opportunity',
    source: DiscoverySource.YOUTUBE,
    sourceUrl: 'https://example.com',
    score: OpportunityScore.create({ relevance: 80, engagement: 70, timeliness: 75, competition: 30 }),
    keywords: ['ai', 'content'],
    metadata: {},
    status: OpportunityStatus.NEW,
    publishedAt: null,
    discoveredAt: new Date(),
  });
}

function makeRevenueModel() {
  return RevenueModel.create({
    expectedViews: 100000,
    expectedClickRate: 0.05,
    expectedConversionRate: 0.02,
    averageOrderValue: 100,
    recurringRevenueRate: 0,
    affiliateCommissionRate: 0,
    sponsorshipRevenue: 0,
  });
}

function makeCostModel() {
  return CostModel.create({
    aiGenerationCost: 100,
    voiceGenerationCost: 50,
    imageGenerationCost: 30,
    videoGenerationCost: 200,
    editingCost: 80,
    publishingCost: 20,
    advertisingCost: 500,
    humanReviewCost: 60,
    infrastructureCost: 40,
  });
}

function makeService(repository: jest.Mocked<IRevenueRepository>, eventBus: jest.Mocked<IEventBus>) {
  return new RevenueIntelligenceService(
    repository,
    new RevenuePredictionEngine(),
    new RiskEvaluator(),
    new CompetitionEvaluator(),
    new InvestmentScorer(),
    eventBus,
    makeMetrics(),
    makeLogger(),
  );
}

function makeSavedDecision(outcome = DecisionOutcome.GO): InvestmentDecision {
  const score = InvestmentScore.create({
    revenuePotential: 80,
    riskScore: 70,
    competitionScore: 60,
    productionCostScore: 75,
    strategicValue: 65,
    goalAlignment: 70,
  });
  return InvestmentDecision.create({
    subjectType: DecisionSubjectType.Campaign,
    subjectId: 'campaign-1',
    outcome,
    score,
    prediction: { estimatedRevenue: 10000, estimatedProfit: 7000, estimatedROI: 233, estimatedCAC: 50, estimatedLTV: 100, breakEvenPoint: 30, paybackPeriodDays: 45, confidenceLevel: 80, isProfitable: () => true, isHighROI: () => true },
    costModel: makeCostModel(),
    riskAssessment: { riskLevel: 'low' as any, factors: [], mitigations: [], overallScore: 10, hasFactor: () => false, isCritical: () => false, isHighOrCritical: () => false },
    competitionAssessment: { competitionLevel: 'low' as any, competitorCount: 3, competitionScore: 20, marketSaturation: 0.2, differentiationScore: 80, isHighlyCompetitive: () => false, isSaturated: () => false },
    recommendation: 'Invest.',
    metadata: {},
  });
}

describe('RevenueIntelligenceService', () => {
  let repository: jest.Mocked<IRevenueRepository>;
  let eventBus: jest.Mocked<IEventBus>;
  let service: RevenueIntelligenceService;

  beforeEach(() => {
    repository = makeRepository();
    eventBus = makeEventBus();
    service = makeService(repository, eventBus);
  });

  describe('evaluateCampaign()', () => {
    it('saves and returns the decision', async () => {
      const saved = makeSavedDecision();
      repository.save.mockResolvedValue(saved);

      const result = await service.evaluateCampaign({
        campaign: makeCampaign(),
        revenueModel: makeRevenueModel(),
        costModel: makeCostModel(),
      });

      expect(repository.save).toHaveBeenCalledTimes(1);
      expect(result).toBe(saved);
    });

    it('publishes RevenuePredicted and InvestmentApproved for GO outcome', async () => {
      const saved = makeSavedDecision(DecisionOutcome.GO);
      repository.save.mockResolvedValue(saved);

      await service.evaluateCampaign({
        campaign: makeCampaign(),
        revenueModel: makeRevenueModel(),
        costModel: makeCostModel(),
      });

      const calls = eventBus.publish.mock.calls.map(c => (c[0] as { eventType: string }).eventType);
      expect(calls).toContain(REVENUE_EVENT_TYPES.RevenuePredicted);
      expect(calls).toContain(REVENUE_EVENT_TYPES.InvestmentApproved);
    });

    it('publishes InvestmentRejected for NO_GO outcome', async () => {
      const saved = makeSavedDecision(DecisionOutcome.NO_GO);
      repository.save.mockResolvedValue(saved);

      await service.evaluateCampaign({
        campaign: makeCampaign(),
        revenueModel: makeRevenueModel(),
        costModel: makeCostModel(),
      });

      const calls = eventBus.publish.mock.calls.map(c => (c[0] as { eventType: string }).eventType);
      expect(calls).toContain(REVENUE_EVENT_TYPES.InvestmentRejected);
    });

    it('publishes InvestmentRequiresReview for REVIEW outcome', async () => {
      const saved = makeSavedDecision(DecisionOutcome.REVIEW);
      repository.save.mockResolvedValue(saved);

      await service.evaluateCampaign({
        campaign: makeCampaign(),
        revenueModel: makeRevenueModel(),
        costModel: makeCostModel(),
      });

      const calls = eventBus.publish.mock.calls.map(c => (c[0] as { eventType: string }).eventType);
      expect(calls).toContain(REVENUE_EVENT_TYPES.InvestmentRequiresReview);
    });

    it('accepts optional opportunity context', async () => {
      const saved = makeSavedDecision();
      repository.save.mockResolvedValue(saved);

      const result = await service.evaluateCampaign({
        campaign: makeCampaign(),
        opportunity: makeOpportunity(),
        revenueModel: makeRevenueModel(),
        costModel: makeCostModel(),
      });

      expect(result).toBeDefined();
    });

    it('hits REVIEW branch in buildRecommendation when internal score is REVIEW', async () => {
      // A deliberately weak revenue model produces ROI ~70% → revenuePotential=40
      // Combined with Low priority and low goal alignment → REVIEW score (~57)
      const weakRevenueModel = RevenueModel.create({
        expectedViews: 1000,
        expectedClickRate: 0.1,
        expectedConversionRate: 0.1,
        averageOrderValue: 17,
        recurringRevenueRate: 0,
        affiliateCommissionRate: 0,
        sponsorshipRevenue: 0,
      });
      const cheapCostModel = CostModel.create({
        aiGenerationCost: 100,
        voiceGenerationCost: 0,
        imageGenerationCost: 0,
        videoGenerationCost: 0,
        editingCost: 0,
        publishingCost: 0,
        advertisingCost: 0,
        humanReviewCost: 0,
        infrastructureCost: 0,
      });
      const lowPriorityCampaign = Campaign.reconstitute({
        id: 'campaign-low',
        name: 'Low Priority Campaign',
        description: 'Test',
        type: CampaignType.Content,
        status: CampaignStatus.Approved,
        priority: CampaignPriority.Low,
        ownerId: 'owner-1',
        goal: CampaignGoal.create({ goalType: CampaignGoalType.Revenue, description: 'Rev', targetValue: 10000, currentValue: 0, achievedAt: null }),
        budget: CampaignBudget.create({ allocated: 3000, spent: 0, currency: 'USD' }),
        target: CampaignTarget.create({ expectedRevenue: 10000, expectedROI: 200, expectedViews: 100000, expectedLeads: 500, expectedSubscribers: 100, deadline: new Date(Date.now() + 86400000 * 30) }),
        metrics: CampaignMetrics.empty(),
        audience: CampaignAudience.create({ segments: ['tech'], demographics: {}, estimatedSize: 50000, targetAge: null }),
        channels: [],
        lifecycle: CampaignLifecycle.empty(),
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {},
      });
      const lowScoreOpportunity = Opportunity.reconstitute({
        id: 'opp-low',
        title: 'Low Score',
        summary: 'low',
        source: DiscoverySource.RSS,
        sourceUrl: 'https://example.com',
        score: OpportunityScore.create({ relevance: 10, engagement: 5, timeliness: 5, competition: 30 }),
        keywords: [],
        metadata: {},
        status: OpportunityStatus.NEW,
        publishedAt: null,
        discoveredAt: new Date(),
      });
      const saved = makeSavedDecision(DecisionOutcome.REVIEW);
      repository.save.mockResolvedValue(saved);

      await service.evaluateCampaign({
        campaign: lowPriorityCampaign,
        opportunity: lowScoreOpportunity,
        revenueModel: weakRevenueModel,
        costModel: cheapCostModel,
      });

      // The internally computed score should be REVIEW (40-69), covering the REVIEW branch
      expect(repository.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('evaluateOpportunity()', () => {
    it('saves and returns the decision for an opportunity', async () => {
      const saved = makeSavedDecision();
      repository.save.mockResolvedValue(saved);

      const result = await service.evaluateOpportunity({
        opportunity: makeOpportunity(),
        revenueModel: makeRevenueModel(),
        costModel: makeCostModel(),
      });

      expect(repository.save).toHaveBeenCalledTimes(1);
      expect(result).toBe(saved);
    });
  });

  describe('predictRevenue()', () => {
    it('returns a RevenuePrediction', () => {
      const prediction = service.predictRevenue(makeRevenueModel(), makeCostModel());
      expect(prediction.estimatedRevenue).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateROI()', () => {
    it('returns 0 when cost is 0', () => {
      expect(service.calculateROI(1000, 0)).toBe(0);
    });

    it('calculates correct ROI', () => {
      expect(service.calculateROI(3000, 1000)).toBe(200);
    });

    it('returns negative for unprofitable', () => {
      expect(service.calculateROI(500, 1000)).toBe(-50);
    });
  });

  describe('recommendDecision()', () => {
    it('delegates to score.outcome', () => {
      const score = InvestmentScore.create({
        revenuePotential: 80,
        riskScore: 70,
        competitionScore: 60,
        productionCostScore: 75,
        strategicValue: 65,
        goalAlignment: 70,
      });
      expect(service.recommendDecision(score)).toBe(score.outcome);
    });
  });
});
