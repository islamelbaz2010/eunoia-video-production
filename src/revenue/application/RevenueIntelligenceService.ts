import {
  InvestmentDecision,
  DecisionSubjectType,
} from '../domain/models/InvestmentDecision';
import { DecisionOutcome } from '../domain/models/InvestmentScore';
import type { RevenueModel } from '../domain/models/RevenueModel';
import type { CostModel } from '../domain/models/CostModel';
import type { RevenuePrediction } from '../domain/models/RevenuePrediction';
import type { InvestmentScore } from '../domain/models/InvestmentScore';
import type { IRevenueRepository } from '../domain/repositories/IRevenueRepository';
import type { RevenuePredictionEngine } from '../prediction/RevenuePredictionEngine';
import type { RiskEvaluator } from '../scoring/RiskEvaluator';
import type { CompetitionEvaluator } from '../scoring/CompetitionEvaluator';
import { type InvestmentScorer, type ScoreInputs } from '../scoring/InvestmentScorer';
import type { RiskAssessment } from '../domain/models/RiskAssessment';
import type { CompetitionAssessment } from '../domain/models/CompetitionAssessment';
import { REVENUE_EVENT_TYPES } from '../events/RevenueEvents';
import type { IEventBus } from '../../core/events/IEventBus';
import { createDomainEvent } from '../../core/events/DomainEvent';
import type { IMetricsService } from '../../core/metrics/IMetricsService';
import type { ILogger } from '../../shared/logger/ILogger';
import type { Campaign } from '../../campaign/domain/models/Campaign';
import { CampaignPriority } from '../../campaign/domain/models/Campaign';
import type { Opportunity } from '../../discovery/domain/models/Opportunity';

const PRIORITY_LEVEL: Record<CampaignPriority, number> = {
  [CampaignPriority.Critical]: 100,
  [CampaignPriority.High]: 75,
  [CampaignPriority.Normal]: 50,
  [CampaignPriority.Low]: 25,
};

export interface EvaluateCampaignInput {
  campaign: Campaign;
  opportunity?: Opportunity;
  revenueModel: RevenueModel;
  costModel: CostModel;
}

export interface EvaluateOpportunityInput {
  opportunity: Opportunity;
  revenueModel: RevenueModel;
  costModel: CostModel;
}

export class RevenueIntelligenceService {
  private readonly logger: ILogger;

  constructor(
    private readonly repository: IRevenueRepository,
    private readonly predictionEngine: RevenuePredictionEngine,
    private readonly riskEvaluator: RiskEvaluator,
    private readonly competitionEvaluator: CompetitionEvaluator,
    private readonly investmentScorer: InvestmentScorer,
    private readonly eventBus: IEventBus,
    private readonly metricsService: IMetricsService,
    logger: ILogger,
  ) {
    this.logger = logger.child({ service: 'RevenueIntelligenceService' });
  }

  async evaluateCampaign(input: EvaluateCampaignInput): Promise<InvestmentDecision> {
    const { campaign, opportunity, revenueModel, costModel } = input;
    const startTime = Date.now();

    this.logger.info({ campaignId: campaign.id, campaignName: campaign.name }, 'Evaluating campaign');

    const prediction = this.predictRevenue(revenueModel, costModel);

    const competitionScore = opportunity?.score.competition ?? 50;
    const competition = this.competitionEvaluator.evaluate({
      opportunityCompetitionScore: competitionScore,
      channelCount: Math.max(1, campaign.channels.length),
    });

    const risk = this.riskEvaluator.evaluate({
      competitionScore,
      confidenceLevel: prediction.confidenceLevel,
      costTotal: costModel.total,
      budgetAllocated: campaign.budget.allocated,
      audienceSize: campaign.audience.estimatedSize,
      hasOpportunityData: opportunity !== undefined,
    });

    const score = this.calculateInvestmentScore({
      prediction,
      risk,
      competition,
      priorityLevel: PRIORITY_LEVEL[campaign.priority] ?? 50,
      expectedRevenueTarget: campaign.target.expectedRevenue,
      opportunityScore: opportunity?.score.total ?? 50,
    });

    const outcome = this.recommendDecision(score);
    const recommendation = this.buildRecommendation(score, risk, competition, prediction);

    const decision = InvestmentDecision.create({
      subjectType: DecisionSubjectType.Campaign,
      subjectId: campaign.id,
      outcome,
      score,
      prediction,
      costModel,
      riskAssessment: risk,
      competitionAssessment: competition,
      recommendation,
      metadata: { campaignName: campaign.name, campaignType: campaign.type },
    });

    const saved = await this.repository.save(decision);
    await this.publishDecisionEvents(saved);

    const duration = Date.now() - startTime;
    this.metricsService.recordExecutionTime(duration);
    this.logger.info(
      { campaignId: campaign.id, outcome: saved.outcome, score: saved.score.total, durationMs: duration },
      'Campaign evaluation complete',
    );

    return saved;
  }

  async evaluateOpportunity(input: EvaluateOpportunityInput): Promise<InvestmentDecision> {
    const { opportunity, revenueModel, costModel } = input;
    const startTime = Date.now();

    this.logger.info({ opportunityId: opportunity.id }, 'Evaluating opportunity');

    const prediction = this.predictRevenue(revenueModel, costModel);

    const competition = this.competitionEvaluator.evaluate({
      opportunityCompetitionScore: opportunity.score.competition,
      channelCount: 1,
    });

    const risk = this.riskEvaluator.evaluate({
      competitionScore: opportunity.score.competition,
      confidenceLevel: prediction.confidenceLevel,
      costTotal: costModel.total,
      budgetAllocated: costModel.total > 0 ? costModel.total * 2 : 1,
      audienceSize: revenueModel.expectedViews,
      hasOpportunityData: true,
    });

    const score = this.calculateInvestmentScore({
      prediction,
      risk,
      competition,
      priorityLevel: 50,
      expectedRevenueTarget: 0,
      opportunityScore: opportunity.score.total,
    });

    const outcome = this.recommendDecision(score);
    const recommendation = this.buildRecommendation(score, risk, competition, prediction);

    const decision = InvestmentDecision.create({
      subjectType: DecisionSubjectType.Opportunity,
      subjectId: opportunity.id,
      outcome,
      score,
      prediction,
      costModel,
      riskAssessment: risk,
      competitionAssessment: competition,
      recommendation,
      metadata: { opportunityTitle: opportunity.title, source: opportunity.source },
    });

    const saved = await this.repository.save(decision);
    await this.publishDecisionEvents(saved);

    const duration = Date.now() - startTime;
    this.metricsService.recordExecutionTime(duration);
    this.logger.info(
      { opportunityId: opportunity.id, outcome: saved.outcome, score: saved.score.total },
      'Opportunity evaluation complete',
    );

    return saved;
  }

  predictRevenue(revenueModel: RevenueModel, costModel: CostModel): RevenuePrediction {
    return this.predictionEngine.predict(revenueModel, costModel);
  }

  calculateROI(revenue: number, cost: number): number {
    if (cost <= 0) return 0;
    return Math.round(((revenue - cost) / cost) * 100 * 100) / 100;
  }

  calculateInvestmentScore(inputs: ScoreInputs): InvestmentScore {
    return this.investmentScorer.calculateScore(inputs);
  }

  recommendDecision(score: InvestmentScore): DecisionOutcome {
    return score.outcome;
  }

  private async publishDecisionEvents(decision: InvestmentDecision): Promise<void> {
    await this.eventBus.publish(
      createDomainEvent(REVENUE_EVENT_TYPES.RevenuePredicted, decision.id, {
        subjectId: decision.subjectId,
        estimatedRevenue: decision.prediction.estimatedRevenue,
        estimatedROI: decision.prediction.estimatedROI,
        confidenceLevel: decision.prediction.confidenceLevel,
      }),
    );

    if (decision.outcome === DecisionOutcome.GO) {
      await this.eventBus.publish(
        createDomainEvent(REVENUE_EVENT_TYPES.InvestmentApproved, decision.id, {
          subjectId: decision.subjectId,
          score: decision.score.total,
          outcome: decision.outcome,
          estimatedRevenue: decision.prediction.estimatedRevenue,
        }),
      );
    } else if (decision.outcome === DecisionOutcome.NO_GO) {
      await this.eventBus.publish(
        createDomainEvent(REVENUE_EVENT_TYPES.InvestmentRejected, decision.id, {
          subjectId: decision.subjectId,
          score: decision.score.total,
          outcome: decision.outcome,
          reason: decision.recommendation,
        }),
      );
    } else {
      await this.eventBus.publish(
        createDomainEvent(REVENUE_EVENT_TYPES.InvestmentRequiresReview, decision.id, {
          subjectId: decision.subjectId,
          score: decision.score.total,
          outcome: decision.outcome,
          riskFactors: [...decision.riskAssessment.factors],
        }),
      );
    }
  }

  private buildRecommendation(
    score: InvestmentScore,
    risk: RiskAssessment,
    competition: CompetitionAssessment,
    prediction: RevenuePrediction,
  ): string {
    const parts: string[] = [];

    if (score.outcome === DecisionOutcome.GO) {
      parts.push(`Strong investment opportunity with a score of ${score.total}/100.`);
    } else if (score.outcome === DecisionOutcome.REVIEW) {
      parts.push(`Investment requires review with a score of ${score.total}/100.`);
    } else {
      parts.push(`Investment not recommended with a score of ${score.total}/100.`);
    }

    parts.push(`Predicted ROI: ${prediction.estimatedROI.toFixed(1)}%.`);
    parts.push(`Risk level: ${risk.riskLevel}.`);

    if (risk.factors.length > 0) {
      parts.push(`Risk factors: ${risk.factors.join(', ')}.`);
    }

    if (competition.isHighlyCompetitive()) {
      parts.push(
        `High competition detected (${competition.competitionLevel}, score: ${competition.competitionScore}/100).`,
      );
    }

    if (risk.mitigations.length > 0) {
      parts.push(`Suggested mitigations: ${risk.mitigations.slice(0, 2).join('; ')}.`);
    }

    return parts.join(' ');
  }
}
