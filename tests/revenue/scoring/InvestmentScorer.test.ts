import { InvestmentScorer } from '../../../src/revenue/scoring/InvestmentScorer';
import { DecisionOutcome } from '../../../src/revenue/domain/models/InvestmentScore';
import { RevenuePrediction } from '../../../src/revenue/domain/models/RevenuePrediction';
import { RiskAssessment, RiskLevel } from '../../../src/revenue/domain/models/RiskAssessment';
import { CompetitionAssessment, CompetitionLevel } from '../../../src/revenue/domain/models/CompetitionAssessment';

function makePrediction(roi: number, profit = 3000) {
  return RevenuePrediction.create({
    estimatedRevenue: 10000,
    estimatedProfit: profit,
    estimatedROI: roi,
    estimatedCAC: 50,
    estimatedLTV: 200,
    breakEvenPoint: 30,
    paybackPeriodDays: 45,
    confidenceLevel: 80,
  });
}

function makeRisk(overallScore: number) {
  return RiskAssessment.create({ riskLevel: RiskLevel.Low, factors: [], mitigations: [], overallScore });
}

function makeCompetition(differentiationScore: number) {
  return CompetitionAssessment.create({
    competitionLevel: CompetitionLevel.Low,
    competitorCount: 5,
    competitionScore: 100 - differentiationScore,
    marketSaturation: 0.2,
    differentiationScore,
  });
}

function makeInputs(overrides = {}) {
  return {
    prediction: makePrediction(200, 6000),
    risk: makeRisk(10),
    competition: makeCompetition(90),
    priorityLevel: 75,
    expectedRevenueTarget: 10000,
    opportunityScore: 80,
    ...overrides,
  };
}

describe('InvestmentScorer', () => {
  const scorer = new InvestmentScorer();

  it('returns a GO outcome for strong inputs', () => {
    const score = scorer.calculateScore(makeInputs());
    expect(score.isGo()).toBe(true);
  });

  it('returns NO_GO for unprofitable predictions', () => {
    const score = scorer.calculateScore(makeInputs({
      prediction: makePrediction(-50, -500),
      risk: makeRisk(90),
      competition: makeCompetition(10),
      priorityLevel: 10,
      expectedRevenueTarget: 100000,
      opportunityScore: 10,
    }));
    expect(score.isNoGo()).toBe(true);
  });

  it('risk score is inverted risk overallScore', () => {
    const score = scorer.calculateScore(makeInputs({ risk: makeRisk(30) }));
    expect(score.riskScore).toBe(70);
  });

  it('competitionScore equals differentiationScore', () => {
    const score = scorer.calculateScore(makeInputs({ competition: makeCompetition(60) }));
    expect(score.competitionScore).toBe(60);
  });

  it('goal alignment is 100 when estimated revenue meets target', () => {
    const score = scorer.calculateScore(makeInputs({
      prediction: makePrediction(100, 5000),
      expectedRevenueTarget: 10000,
    }));
    expect(score.goalAlignment).toBe(100);
  });

  it('goal alignment is 50 when expected revenue target is 0', () => {
    const score = scorer.calculateScore(makeInputs({ expectedRevenueTarget: 0 }));
    expect(score.goalAlignment).toBe(50);
  });

  it('revenue potential is 0 when ROI is negative', () => {
    const score = scorer.calculateScore(makeInputs({
      prediction: makePrediction(-20, -500),
    }));
    expect(score.revenuePotential).toBe(0);
  });

  it('revenue potential is 100 when ROI >= 300', () => {
    const score = scorer.calculateScore(makeInputs({
      prediction: makePrediction(300, 9000),
    }));
    expect(score.revenuePotential).toBe(100);
  });

  it('productionCostScore is 60 for 30-49% margin', () => {
    // profit = 3500, revenue = 10000 → margin = 0.35
    const score = scorer.calculateScore(makeInputs({
      prediction: makePrediction(100, 3500),
    }));
    expect(score.productionCostScore).toBe(60);
  });

  it('productionCostScore is 40 for 10-29% margin', () => {
    // profit = 1500, revenue = 10000 → margin = 0.15
    const score = scorer.calculateScore(makeInputs({
      prediction: makePrediction(100, 1500),
    }));
    expect(score.productionCostScore).toBe(40);
  });

  it('productionCostScore is 20 for < 10% margin', () => {
    // profit = 500, revenue = 10000 → margin = 0.05
    const score = scorer.calculateScore(makeInputs({
      prediction: makePrediction(100, 500),
    }));
    expect(score.productionCostScore).toBe(20);
  });
});
