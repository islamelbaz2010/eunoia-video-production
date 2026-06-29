import { RiskAssessment, RiskFactor, RiskLevel } from '../domain/models/RiskAssessment';

export interface RiskEvaluationInput {
  competitionScore: number;
  confidenceLevel: number;
  costTotal: number;
  budgetAllocated: number;
  audienceSize: number;
  hasOpportunityData: boolean;
}

const RISK_FACTOR_WEIGHTS: Record<RiskFactor, number> = {
  [RiskFactor.HighCompetition]: 15,
  [RiskFactor.LowConfidence]: 20,
  [RiskFactor.HighProductionCost]: 20,
  [RiskFactor.LimitedAudience]: 15,
  [RiskFactor.MissingData]: 15,
  [RiskFactor.BudgetConstraints]: 15,
};

const MAX_RISK_WEIGHT = Object.values(RISK_FACTOR_WEIGHTS).reduce((a, b) => a + b, 0);

export class RiskEvaluator {
  evaluate(input: RiskEvaluationInput): RiskAssessment {
    const factors: RiskFactor[] = [];
    const mitigations: string[] = [];

    if (input.competitionScore > 60) {
      factors.push(RiskFactor.HighCompetition);
      mitigations.push('Differentiate content angle and target an underserved niche');
    }

    if (input.confidenceLevel < 40) {
      factors.push(RiskFactor.LowConfidence);
      mitigations.push('Gather additional market data before committing production resources');
    }

    if (input.budgetAllocated > 0 && input.costTotal > input.budgetAllocated * 0.9) {
      factors.push(RiskFactor.HighProductionCost);
      mitigations.push('Reduce production scope or negotiate lower vendor rates');
    }

    if (input.audienceSize < 1000) {
      factors.push(RiskFactor.LimitedAudience);
      mitigations.push('Expand audience targeting criteria or choose a broader niche');
    }

    if (!input.hasOpportunityData) {
      factors.push(RiskFactor.MissingData);
      mitigations.push('Complete opportunity research and scoring before evaluation');
    }

    if (input.budgetAllocated > 0 && input.costTotal > input.budgetAllocated) {
      factors.push(RiskFactor.BudgetConstraints);
      mitigations.push('Increase allocated budget or reduce total production costs');
    }

    const overallScore = this.computeOverallScore(factors);
    const riskLevel = this.computeRiskLevel(overallScore);

    return RiskAssessment.create({ riskLevel, factors, mitigations, overallScore });
  }

  private computeOverallScore(factors: RiskFactor[]): number {
    if (factors.length === 0) return 0;
    const totalWeight = factors.reduce((sum, f) => sum + RISK_FACTOR_WEIGHTS[f], 0);
    return Math.min(100, Math.round((totalWeight / MAX_RISK_WEIGHT) * 100));
  }

  private computeRiskLevel(score: number): RiskLevel {
    if (score >= 75) return RiskLevel.Critical;
    if (score >= 50) return RiskLevel.High;
    if (score >= 25) return RiskLevel.Medium;
    return RiskLevel.Low;
  }
}
