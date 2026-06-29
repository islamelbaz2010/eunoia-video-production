import { InvestmentDecision, DecisionSubjectType } from '../../../src/revenue/domain/models/InvestmentDecision';
import { DecisionOutcome, InvestmentScore } from '../../../src/revenue/domain/models/InvestmentScore';
import { RevenuePrediction } from '../../../src/revenue/domain/models/RevenuePrediction';
import { CostModel } from '../../../src/revenue/domain/models/CostModel';
import { RiskAssessment, RiskLevel } from '../../../src/revenue/domain/models/RiskAssessment';
import { CompetitionAssessment, CompetitionLevel } from '../../../src/revenue/domain/models/CompetitionAssessment';

function makeScore() {
  return InvestmentScore.create({
    revenuePotential: 80,
    riskScore: 70,
    competitionScore: 60,
    productionCostScore: 75,
    strategicValue: 65,
    goalAlignment: 70,
  });
}

function makePrediction() {
  return RevenuePrediction.create({
    estimatedRevenue: 10000,
    estimatedProfit: 7000,
    estimatedROI: 233,
    estimatedCAC: 50,
    estimatedLTV: 200,
    breakEvenPoint: 30,
    paybackPeriodDays: 45,
    confidenceLevel: 80,
  });
}

function makeCostModel() {
  return CostModel.zero();
}

function makeRiskAssessment() {
  return RiskAssessment.create({ riskLevel: RiskLevel.Low, factors: [], mitigations: [], overallScore: 10 });
}

function makeCompetitionAssessment() {
  return CompetitionAssessment.create({
    competitionLevel: CompetitionLevel.Low,
    competitorCount: 3,
    competitionScore: 20,
    marketSaturation: 0.2,
    differentiationScore: 80,
  });
}

function makeCreateProps(overrides = {}) {
  return {
    subjectType: DecisionSubjectType.Campaign,
    subjectId: 'campaign-1',
    outcome: DecisionOutcome.GO,
    score: makeScore(),
    prediction: makePrediction(),
    costModel: makeCostModel(),
    riskAssessment: makeRiskAssessment(),
    competitionAssessment: makeCompetitionAssessment(),
    recommendation: 'Strong investment.',
    metadata: { campaignName: 'Test' },
    ...overrides,
  };
}

describe('InvestmentDecision', () => {
  it('create() sets id and evaluatedAt automatically', () => {
    const before = new Date();
    const d = InvestmentDecision.create(makeCreateProps());
    const after = new Date();
    expect(d.id).toBeTruthy();
    expect(d.evaluatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(d.evaluatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('reconstitute() preserves all supplied props', () => {
    const props = { ...makeCreateProps(), id: 'fixed-id', evaluatedAt: new Date('2026-01-01') };
    const d = InvestmentDecision.reconstitute(props);
    expect(d.id).toBe('fixed-id');
    expect(d.evaluatedAt.toISOString()).toContain('2026-01-01');
  });

  it('metadata is frozen', () => {
    const d = InvestmentDecision.create(makeCreateProps({ metadata: { foo: 'bar' } }));
    expect(Object.isFrozen(d.metadata)).toBe(true);
  });

  it('isApproved returns true for GO', () => {
    expect(InvestmentDecision.create(makeCreateProps({ outcome: DecisionOutcome.GO })).isApproved()).toBe(true);
    expect(InvestmentDecision.create(makeCreateProps({ outcome: DecisionOutcome.NO_GO })).isApproved()).toBe(false);
  });

  it('isRejected returns true for NO_GO', () => {
    expect(InvestmentDecision.create(makeCreateProps({ outcome: DecisionOutcome.NO_GO })).isRejected()).toBe(true);
  });

  it('requiresReview returns true for REVIEW', () => {
    expect(InvestmentDecision.create(makeCreateProps({ outcome: DecisionOutcome.REVIEW })).requiresReview()).toBe(true);
  });
});
