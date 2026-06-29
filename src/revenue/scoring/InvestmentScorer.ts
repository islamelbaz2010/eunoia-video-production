import { InvestmentScore } from '../domain/models/InvestmentScore';
import type { RevenuePrediction } from '../domain/models/RevenuePrediction';
import type { RiskAssessment } from '../domain/models/RiskAssessment';
import type { CompetitionAssessment } from '../domain/models/CompetitionAssessment';

export interface ScoreInputs {
  prediction: RevenuePrediction;
  risk: RiskAssessment;
  competition: CompetitionAssessment;
  priorityLevel: number;
  expectedRevenueTarget: number;
  opportunityScore: number;
}

export class InvestmentScorer {
  calculateScore(inputs: ScoreInputs): InvestmentScore {
    const revenuePotential = this.scoreRevenuePotential(inputs.prediction);
    const riskScore = Math.max(0, 100 - inputs.risk.overallScore);
    const competitionScore = inputs.competition.differentiationScore;
    const productionCostScore = this.scoreProductionCost(inputs.prediction);
    const strategicValue = this.scoreStrategicValue(inputs.priorityLevel, inputs.opportunityScore);
    const goalAlignment = this.scoreGoalAlignment(
      inputs.prediction.estimatedRevenue,
      inputs.expectedRevenueTarget,
    );

    return InvestmentScore.create({
      revenuePotential,
      riskScore,
      competitionScore,
      productionCostScore,
      strategicValue,
      goalAlignment,
    });
  }

  private scoreRevenuePotential(prediction: RevenuePrediction): number {
    const roi = prediction.estimatedROI;
    if (roi >= 300) return 100;
    if (roi >= 200) return 80;
    if (roi >= 100) return 60;
    if (roi >= 50) return 40;
    if (roi > 0) return 20;
    return 0;
  }

  private scoreProductionCost(prediction: RevenuePrediction): number {
    if (!prediction.isProfitable() || prediction.estimatedRevenue <= 0) return 0;
    const margin = prediction.estimatedProfit / prediction.estimatedRevenue;
    if (margin >= 0.7) return 100;
    if (margin >= 0.5) return 80;
    if (margin >= 0.3) return 60;
    if (margin >= 0.1) return 40;
    return 20;
  }

  private scoreStrategicValue(priorityLevel: number, opportunityScore: number): number {
    return Math.round((priorityLevel + opportunityScore) / 2);
  }

  private scoreGoalAlignment(estimatedRevenue: number, expectedRevenueTarget: number): number {
    if (expectedRevenueTarget <= 0) return 50;
    const ratio = estimatedRevenue / expectedRevenueTarget;
    return Math.round(Math.min(100, Math.max(0, ratio * 100)));
  }
}
