import { RiskEvaluator } from '../../../src/revenue/scoring/RiskEvaluator';
import { RiskFactor, RiskLevel } from '../../../src/revenue/domain/models/RiskAssessment';

function make(overrides = {}) {
  return {
    competitionScore: 30,
    confidenceLevel: 80,
    costTotal: 500,
    budgetAllocated: 1000,
    audienceSize: 50000,
    hasOpportunityData: true,
    ...overrides,
  };
}

describe('RiskEvaluator', () => {
  const evaluator = new RiskEvaluator();

  it('returns Low risk for healthy inputs', () => {
    const result = evaluator.evaluate(make());
    expect(result.riskLevel).toBe(RiskLevel.Low);
    expect(result.factors).toHaveLength(0);
  });

  it('detects HighCompetition when competitionScore > 60', () => {
    const result = evaluator.evaluate(make({ competitionScore: 65 }));
    expect(result.hasFactor(RiskFactor.HighCompetition)).toBe(true);
  });

  it('detects LowConfidence when confidenceLevel < 40', () => {
    const result = evaluator.evaluate(make({ confidenceLevel: 35 }));
    expect(result.hasFactor(RiskFactor.LowConfidence)).toBe(true);
  });

  it('detects HighProductionCost when cost is >90% of budget', () => {
    const result = evaluator.evaluate(make({ costTotal: 920, budgetAllocated: 1000 }));
    expect(result.hasFactor(RiskFactor.HighProductionCost)).toBe(true);
  });

  it('detects LimitedAudience when audienceSize < 1000', () => {
    const result = evaluator.evaluate(make({ audienceSize: 500 }));
    expect(result.hasFactor(RiskFactor.LimitedAudience)).toBe(true);
  });

  it('detects MissingData when hasOpportunityData is false', () => {
    const result = evaluator.evaluate(make({ hasOpportunityData: false }));
    expect(result.hasFactor(RiskFactor.MissingData)).toBe(true);
  });

  it('detects BudgetConstraints when costTotal > budgetAllocated', () => {
    const result = evaluator.evaluate(make({ costTotal: 1100, budgetAllocated: 1000 }));
    expect(result.hasFactor(RiskFactor.BudgetConstraints)).toBe(true);
  });

  it('includes mitigations for each detected factor', () => {
    const result = evaluator.evaluate(make({
      competitionScore: 70,
      confidenceLevel: 30,
    }));
    expect(result.mitigations.length).toBeGreaterThan(0);
  });

  it('returns Critical level when many factors are present', () => {
    const result = evaluator.evaluate({
      competitionScore: 90,
      confidenceLevel: 10,
      costTotal: 2000,
      budgetAllocated: 1000,
      audienceSize: 100,
      hasOpportunityData: false,
    });
    expect(result.isHighOrCritical()).toBe(true);
  });

  it('overallScore is 0 when no factors', () => {
    const result = evaluator.evaluate(make());
    expect(result.overallScore).toBe(0);
  });

  it('returns High risk when competition + confidence + cost factors fire', () => {
    const result = evaluator.evaluate(make({
      competitionScore: 70,
      confidenceLevel: 30,
      costTotal: 950,
      budgetAllocated: 1000,
    }));
    expect(result.riskLevel).toBe(RiskLevel.High);
  });
});
