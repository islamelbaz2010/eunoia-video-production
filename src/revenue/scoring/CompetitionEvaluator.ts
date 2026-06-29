import { CompetitionAssessment, CompetitionLevel } from '../domain/models/CompetitionAssessment';

export interface CompetitionEvaluationInput {
  opportunityCompetitionScore: number;
  channelCount: number;
}

export class CompetitionEvaluator {
  evaluate(input: CompetitionEvaluationInput): CompetitionAssessment {
    const competitionScore = Math.max(0, Math.min(100, input.opportunityCompetitionScore));
    const competitionLevel = this.computeLevel(competitionScore);
    const marketSaturation = competitionScore / 100;
    const differentiationScore = Math.max(0, 100 - competitionScore);
    const competitorCount = Math.round(Math.max(1, input.channelCount) * (competitionScore / 10));

    return CompetitionAssessment.create({
      competitionLevel,
      competitorCount,
      competitionScore,
      marketSaturation,
      differentiationScore,
    });
  }

  private computeLevel(score: number): CompetitionLevel {
    if (score >= 75) return CompetitionLevel.Saturated;
    if (score >= 50) return CompetitionLevel.High;
    if (score >= 25) return CompetitionLevel.Medium;
    return CompetitionLevel.Low;
  }
}
