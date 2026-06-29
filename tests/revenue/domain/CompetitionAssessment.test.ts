import { CompetitionAssessment, CompetitionLevel } from '../../../src/revenue/domain/models/CompetitionAssessment';

function make(overrides = {}) {
  return CompetitionAssessment.create({
    competitionLevel: CompetitionLevel.Medium,
    competitorCount: 10,
    competitionScore: 50,
    marketSaturation: 0.5,
    differentiationScore: 50,
    ...overrides,
  });
}

describe('CompetitionAssessment', () => {
  it('creates with given props', () => {
    const c = make();
    expect(c.competitionLevel).toBe(CompetitionLevel.Medium);
    expect(c.competitorCount).toBe(10);
    expect(c.competitionScore).toBe(50);
  });

  it('clamps scores to valid ranges', () => {
    const c = make({ competitionScore: 150, marketSaturation: 2, differentiationScore: -10 });
    expect(c.competitionScore).toBe(100);
    expect(c.marketSaturation).toBe(1);
    expect(c.differentiationScore).toBe(0);
  });

  it('competitorCount cannot be negative', () => {
    expect(make({ competitorCount: -5 }).competitorCount).toBe(0);
  });

  it('isHighlyCompetitive returns true for High and Saturated', () => {
    expect(make({ competitionLevel: CompetitionLevel.High }).isHighlyCompetitive()).toBe(true);
    expect(make({ competitionLevel: CompetitionLevel.Saturated }).isHighlyCompetitive()).toBe(true);
    expect(make({ competitionLevel: CompetitionLevel.Medium }).isHighlyCompetitive()).toBe(false);
    expect(make({ competitionLevel: CompetitionLevel.Low }).isHighlyCompetitive()).toBe(false);
  });

  it('isSaturated returns true only for Saturated level', () => {
    expect(make({ competitionLevel: CompetitionLevel.Saturated }).isSaturated()).toBe(true);
    expect(make({ competitionLevel: CompetitionLevel.High }).isSaturated()).toBe(false);
  });
});
