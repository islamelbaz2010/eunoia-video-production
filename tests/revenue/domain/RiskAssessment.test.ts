import { RiskAssessment, RiskFactor, RiskLevel } from '../../../src/revenue/domain/models/RiskAssessment';

function make(overrides = {}) {
  return RiskAssessment.create({
    riskLevel: RiskLevel.Medium,
    factors: [RiskFactor.HighCompetition],
    mitigations: ['Niche down'],
    overallScore: 40,
    ...overrides,
  });
}

describe('RiskAssessment', () => {
  it('creates with given props', () => {
    const r = make();
    expect(r.riskLevel).toBe(RiskLevel.Medium);
    expect(r.factors).toContain(RiskFactor.HighCompetition);
    expect(r.overallScore).toBe(40);
  });

  it('clamps overallScore to 0-100', () => {
    expect(make({ overallScore: 200 }).overallScore).toBe(100);
    expect(make({ overallScore: -10 }).overallScore).toBe(0);
  });

  it('hasFactor returns true for present factor', () => {
    const r = make({ factors: [RiskFactor.LowConfidence, RiskFactor.MissingData] });
    expect(r.hasFactor(RiskFactor.LowConfidence)).toBe(true);
    expect(r.hasFactor(RiskFactor.BudgetConstraints)).toBe(false);
  });

  it('isCritical returns true only for Critical level', () => {
    expect(make({ riskLevel: RiskLevel.Critical }).isCritical()).toBe(true);
    expect(make({ riskLevel: RiskLevel.High }).isCritical()).toBe(false);
  });

  it('isHighOrCritical returns true for High and Critical', () => {
    expect(make({ riskLevel: RiskLevel.High }).isHighOrCritical()).toBe(true);
    expect(make({ riskLevel: RiskLevel.Critical }).isHighOrCritical()).toBe(true);
    expect(make({ riskLevel: RiskLevel.Medium }).isHighOrCritical()).toBe(false);
    expect(make({ riskLevel: RiskLevel.Low }).isHighOrCritical()).toBe(false);
  });

  it('factors and mitigations are immutable arrays', () => {
    const r = make();
    expect(Object.isFrozen(r.factors)).toBe(true);
    expect(Object.isFrozen(r.mitigations)).toBe(true);
  });
});
