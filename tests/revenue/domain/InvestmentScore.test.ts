import { InvestmentScore, DecisionOutcome } from '../../../src/revenue/domain/models/InvestmentScore';

function make(overrides = {}) {
  return InvestmentScore.create({
    revenuePotential: 80,
    riskScore: 70,
    competitionScore: 60,
    productionCostScore: 75,
    strategicValue: 65,
    goalAlignment: 70,
    ...overrides,
  });
}

describe('InvestmentScore', () => {
  it('creates with valid props and computes weighted total', () => {
    const s = make();
    // 80*0.25 + 70*0.20 + 60*0.20 + 75*0.15 + 65*0.10 + 70*0.10
    // = 20 + 14 + 12 + 11.25 + 6.5 + 7 = 70.75 → rounded 71
    expect(s.total).toBe(71);
    expect(s.outcome).toBe(DecisionOutcome.GO);
  });

  it('clamps all dimension scores to 0-100', () => {
    const s = make({ revenuePotential: 150, riskScore: -20 });
    expect(s.revenuePotential).toBe(100);
    expect(s.riskScore).toBe(0);
  });

  it('outcome is GO when total >= 70', () => {
    expect(make().outcome).toBe(DecisionOutcome.GO);
    expect(make().isGo()).toBe(true);
  });

  it('outcome is REVIEW when total is 40-69', () => {
    const s = InvestmentScore.create({
      revenuePotential: 40,
      riskScore: 40,
      competitionScore: 40,
      productionCostScore: 40,
      strategicValue: 40,
      goalAlignment: 40,
    });
    expect(s.outcome).toBe(DecisionOutcome.REVIEW);
    expect(s.requiresReview()).toBe(true);
  });

  it('outcome is NO_GO when total < 40', () => {
    const s = InvestmentScore.create({
      revenuePotential: 10,
      riskScore: 10,
      competitionScore: 10,
      productionCostScore: 10,
      strategicValue: 10,
      goalAlignment: 10,
    });
    expect(s.outcome).toBe(DecisionOutcome.NO_GO);
    expect(s.isNoGo()).toBe(true);
  });

  it('isGo/isNoGo/requiresReview are mutually exclusive', () => {
    const s = make();
    const flags = [s.isGo(), s.isNoGo(), s.requiresReview()];
    expect(flags.filter(Boolean)).toHaveLength(1);
  });
});
