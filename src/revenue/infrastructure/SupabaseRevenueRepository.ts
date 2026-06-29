import type { SupabaseClient } from '@supabase/supabase-js';
import {
  InvestmentDecision,
  DecisionSubjectType,
} from '../domain/models/InvestmentDecision';
import { DecisionOutcome, InvestmentScore } from '../domain/models/InvestmentScore';
import { RevenuePrediction } from '../domain/models/RevenuePrediction';
import { CostModel } from '../domain/models/CostModel';
import { RiskAssessment, RiskLevel, RiskFactor } from '../domain/models/RiskAssessment';
import { CompetitionAssessment, CompetitionLevel } from '../domain/models/CompetitionAssessment';
import type {
  IRevenueRepository,
  RevenueFilter,
} from '../domain/repositories/IRevenueRepository';
import type { ILogger } from '../../shared/logger/ILogger';
import { NotFoundError, RepositoryError } from '../../shared/errors/AppError';

interface InvestmentDecisionRow {
  id: string;
  subject_type: string;
  subject_id: string;
  outcome: string;
  score: Record<string, unknown>;
  prediction: Record<string, unknown>;
  cost_model: Record<string, unknown>;
  risk_assessment: Record<string, unknown>;
  competition_assessment: Record<string, unknown>;
  recommendation: string;
  evaluated_at: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export class SupabaseRevenueRepository implements IRevenueRepository {
  private static readonly TABLE = 'investment_decisions';

  constructor(
    private readonly client: SupabaseClient,
    private readonly logger: ILogger,
  ) {}

  async save(decision: InvestmentDecision): Promise<InvestmentDecision> {
    const row = this.toRow(decision);

    const { data, error } = await this.client
      .from(SupabaseRevenueRepository.TABLE)
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();

    if (error !== null) {
      this.logger.error({ error, decisionId: decision.id }, 'Failed to save investment decision');
      throw new RepositoryError(`Failed to save investment decision: ${error.message}`);
    }

    return this.toDomain(data as InvestmentDecisionRow);
  }

  async findById(id: string): Promise<InvestmentDecision | null> {
    const { data, error } = await this.client
      .from(SupabaseRevenueRepository.TABLE)
      .select()
      .eq('id', id)
      .maybeSingle();

    if (error !== null) {
      this.logger.error({ error, id }, 'Failed to find investment decision');
      throw new RepositoryError(`Failed to find investment decision: ${error.message}`);
    }

    return data !== null ? this.toDomain(data as InvestmentDecisionRow) : null;
  }

  async findByCampaignId(campaignId: string): Promise<InvestmentDecision[]> {
    return this.findAll({ subjectType: DecisionSubjectType.Campaign, subjectId: campaignId });
  }

  async findByOpportunityId(opportunityId: string): Promise<InvestmentDecision[]> {
    return this.findAll({ subjectType: DecisionSubjectType.Opportunity, subjectId: opportunityId });
  }

  async findAll(filter?: RevenueFilter): Promise<InvestmentDecision[]> {
    let query = this.client.from(SupabaseRevenueRepository.TABLE).select();

    if (filter !== undefined) {
      if (filter.outcome !== undefined) {
        query = query.eq('outcome', filter.outcome);
      }
      if (filter.subjectType !== undefined) {
        query = query.eq('subject_type', filter.subjectType);
      }
      if (filter.subjectId !== undefined) {
        query = query.eq('subject_id', filter.subjectId);
      }
      if (filter.since !== undefined) {
        query = query.gte('evaluated_at', filter.since.toISOString());
      }
      if (filter.offset !== undefined) {
        query = query.range(filter.offset, (filter.offset ?? 0) + (filter.limit ?? 50) - 1);
      } else if (filter.limit !== undefined) {
        query = query.limit(filter.limit);
      }
    }

    const { data, error } = await query.order('evaluated_at', { ascending: false });

    if (error !== null) {
      this.logger.error({ error }, 'Failed to list investment decisions');
      throw new RepositoryError(`Failed to list investment decisions: ${error.message}`);
    }

    return (data as InvestmentDecisionRow[]).map(row => this.toDomain(row));
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client
      .from(SupabaseRevenueRepository.TABLE)
      .delete()
      .eq('id', id);

    if (error !== null) {
      this.logger.error({ error, id }, 'Failed to delete investment decision');
      throw new RepositoryError(`Failed to delete investment decision: ${error.message}`);
    }
  }

  async count(filter?: RevenueFilter): Promise<number> {
    let query = this.client
      .from(SupabaseRevenueRepository.TABLE)
      .select('id', { count: 'exact', head: true });

    if (filter !== undefined) {
      if (filter.outcome !== undefined) {
        query = query.eq('outcome', filter.outcome);
      }
      if (filter.subjectType !== undefined) {
        query = query.eq('subject_type', filter.subjectType);
      }
      if (filter.subjectId !== undefined) {
        query = query.eq('subject_id', filter.subjectId);
      }
      if (filter.since !== undefined) {
        query = query.gte('evaluated_at', filter.since.toISOString());
      }
    }

    const result = await query;
    const { count, error } = result as { count: number | null; error: { message: string } | null };

    if (error !== null) {
      this.logger.error({ error }, 'Failed to count investment decisions');
      throw new RepositoryError(`Failed to count investment decisions: ${error.message}`);
    }

    return count ?? 0;
  }

  private toRow(decision: InvestmentDecision): InvestmentDecisionRow {
    return {
      id: decision.id,
      subject_type: decision.subjectType,
      subject_id: decision.subjectId,
      outcome: decision.outcome,
      score: {
        revenuePotential: decision.score.revenuePotential,
        riskScore: decision.score.riskScore,
        competitionScore: decision.score.competitionScore,
        productionCostScore: decision.score.productionCostScore,
        strategicValue: decision.score.strategicValue,
        goalAlignment: decision.score.goalAlignment,
        total: decision.score.total,
        outcome: decision.score.outcome,
      },
      prediction: {
        estimatedRevenue: decision.prediction.estimatedRevenue,
        estimatedProfit: decision.prediction.estimatedProfit,
        estimatedROI: decision.prediction.estimatedROI,
        estimatedCAC: decision.prediction.estimatedCAC,
        estimatedLTV: decision.prediction.estimatedLTV,
        breakEvenPoint: decision.prediction.breakEvenPoint,
        paybackPeriodDays: decision.prediction.paybackPeriodDays,
        confidenceLevel: decision.prediction.confidenceLevel,
      },
      cost_model: {
        aiGenerationCost: decision.costModel.aiGenerationCost,
        voiceGenerationCost: decision.costModel.voiceGenerationCost,
        imageGenerationCost: decision.costModel.imageGenerationCost,
        videoGenerationCost: decision.costModel.videoGenerationCost,
        editingCost: decision.costModel.editingCost,
        publishingCost: decision.costModel.publishingCost,
        advertisingCost: decision.costModel.advertisingCost,
        humanReviewCost: decision.costModel.humanReviewCost,
        infrastructureCost: decision.costModel.infrastructureCost,
        total: decision.costModel.total,
      },
      risk_assessment: {
        riskLevel: decision.riskAssessment.riskLevel,
        factors: decision.riskAssessment.factors,
        mitigations: decision.riskAssessment.mitigations,
        overallScore: decision.riskAssessment.overallScore,
      },
      competition_assessment: {
        competitionLevel: decision.competitionAssessment.competitionLevel,
        competitorCount: decision.competitionAssessment.competitorCount,
        competitionScore: decision.competitionAssessment.competitionScore,
        marketSaturation: decision.competitionAssessment.marketSaturation,
        differentiationScore: decision.competitionAssessment.differentiationScore,
      },
      recommendation: decision.recommendation,
      evaluated_at: decision.evaluatedAt.toISOString(),
      metadata: decision.metadata,
      created_at: new Date().toISOString(),
    };
  }

  private toDomain(row: InvestmentDecisionRow): InvestmentDecision {
    const score = InvestmentScore.create({
      revenuePotential: Number(row.score['revenuePotential'] ?? 0),
      riskScore: Number(row.score['riskScore'] ?? 0),
      competitionScore: Number(row.score['competitionScore'] ?? 0),
      productionCostScore: Number(row.score['productionCostScore'] ?? 0),
      strategicValue: Number(row.score['strategicValue'] ?? 0),
      goalAlignment: Number(row.score['goalAlignment'] ?? 0),
    });

    const prediction = RevenuePrediction.create({
      estimatedRevenue: Number(row.prediction['estimatedRevenue'] ?? 0),
      estimatedProfit: Number(row.prediction['estimatedProfit'] ?? 0),
      estimatedROI: Number(row.prediction['estimatedROI'] ?? 0),
      estimatedCAC: Number(row.prediction['estimatedCAC'] ?? 0),
      estimatedLTV: Number(row.prediction['estimatedLTV'] ?? 0),
      breakEvenPoint: Number(row.prediction['breakEvenPoint'] ?? 0),
      paybackPeriodDays: Number(row.prediction['paybackPeriodDays'] ?? 0),
      confidenceLevel: Number(row.prediction['confidenceLevel'] ?? 0),
    });

    const costModel = CostModel.create({
      aiGenerationCost: Number(row.cost_model['aiGenerationCost'] ?? 0),
      voiceGenerationCost: Number(row.cost_model['voiceGenerationCost'] ?? 0),
      imageGenerationCost: Number(row.cost_model['imageGenerationCost'] ?? 0),
      videoGenerationCost: Number(row.cost_model['videoGenerationCost'] ?? 0),
      editingCost: Number(row.cost_model['editingCost'] ?? 0),
      publishingCost: Number(row.cost_model['publishingCost'] ?? 0),
      advertisingCost: Number(row.cost_model['advertisingCost'] ?? 0),
      humanReviewCost: Number(row.cost_model['humanReviewCost'] ?? 0),
      infrastructureCost: Number(row.cost_model['infrastructureCost'] ?? 0),
    });

    const riskAssessment = RiskAssessment.create({
      riskLevel: (row.risk_assessment['riskLevel'] as RiskLevel) ?? RiskLevel.Low,
      factors: (row.risk_assessment['factors'] as RiskFactor[]) ?? [],
      mitigations: (row.risk_assessment['mitigations'] as string[]) ?? [],
      overallScore: Number(row.risk_assessment['overallScore'] ?? 0),
    });

    const competitionAssessment = CompetitionAssessment.create({
      competitionLevel:
        (row.competition_assessment['competitionLevel'] as CompetitionLevel) ??
        CompetitionLevel.Low,
      competitorCount: Number(row.competition_assessment['competitorCount'] ?? 0),
      competitionScore: Number(row.competition_assessment['competitionScore'] ?? 0),
      marketSaturation: Number(row.competition_assessment['marketSaturation'] ?? 0),
      differentiationScore: Number(row.competition_assessment['differentiationScore'] ?? 0),
    });

    return InvestmentDecision.reconstitute({
      id: row.id,
      subjectType: row.subject_type as DecisionSubjectType,
      subjectId: row.subject_id,
      outcome: row.outcome as DecisionOutcome,
      score,
      prediction,
      costModel,
      riskAssessment,
      competitionAssessment,
      recommendation: row.recommendation,
      evaluatedAt: new Date(row.evaluated_at),
      metadata: row.metadata,
    });
  }
}
