import { CompetitionEvaluator } from '../../../src/revenue/scoring/CompetitionEvaluator';
import { CompetitionLevel } from '../../../src/revenue/domain/models/CompetitionAssessment';

describe('CompetitionEvaluator', () => {
  const evaluator = new CompetitionEvaluator();

  it('returns Low competition for score < 25', () => {
    const result = evaluator.evaluate({ opportunityCompetitionScore: 10, channelCount: 2 });
    expect(result.competitionLevel).toBe(CompetitionLevel.Low);
  });

  it('returns Medium competition for score 25-49', () => {
    const result = evaluator.evaluate({ opportunityCompetitionScore: 40, channelCount: 2 });
    expect(result.competitionLevel).toBe(CompetitionLevel.Medium);
  });

  it('returns High competition for score 50-74', () => {
    const result = evaluator.evaluate({ opportunityCompetitionScore: 60, channelCount: 2 });
    expect(result.competitionLevel).toBe(CompetitionLevel.High);
  });

  it('returns Saturated competition for score >= 75', () => {
    const result = evaluator.evaluate({ opportunityCompetitionScore: 80, channelCount: 2 });
    expect(result.competitionLevel).toBe(CompetitionLevel.Saturated);
  });

  it('differentiationScore is inversely correlated with competition score', () => {
    const low = evaluator.evaluate({ opportunityCompetitionScore: 20, channelCount: 1 });
    const high = evaluator.evaluate({ opportunityCompetitionScore: 80, channelCount: 1 });
    expect(low.differentiationScore).toBeGreaterThan(high.differentiationScore);
  });

  it('marketSaturation is clamped between 0 and 1', () => {
    const r1 = evaluator.evaluate({ opportunityCompetitionScore: 0, channelCount: 1 });
    const r2 = evaluator.evaluate({ opportunityCompetitionScore: 100, channelCount: 1 });
    expect(r1.marketSaturation).toBeGreaterThanOrEqual(0);
    expect(r2.marketSaturation).toBeLessThanOrEqual(1);
  });

  it('isHighlyCompetitive returns true for High/Saturated inputs', () => {
    const result = evaluator.evaluate({ opportunityCompetitionScore: 70, channelCount: 3 });
    expect(result.isHighlyCompetitive()).toBe(true);
  });
});
