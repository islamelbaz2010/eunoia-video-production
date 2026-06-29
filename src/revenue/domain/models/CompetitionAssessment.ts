export enum CompetitionLevel {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Saturated = 'saturated',
}

export interface CompetitionAssessmentProps {
  competitionLevel: CompetitionLevel;
  competitorCount: number;
  competitionScore: number;
  marketSaturation: number;
  differentiationScore: number;
}

export class CompetitionAssessment {
  readonly competitionLevel: CompetitionLevel;
  readonly competitorCount: number;
  readonly competitionScore: number;
  readonly marketSaturation: number;
  readonly differentiationScore: number;

  private constructor(props: CompetitionAssessmentProps) {
    this.competitionLevel = props.competitionLevel;
    this.competitorCount = Math.max(0, props.competitorCount);
    this.competitionScore = Math.max(0, Math.min(100, props.competitionScore));
    this.marketSaturation = Math.max(0, Math.min(1, props.marketSaturation));
    this.differentiationScore = Math.max(0, Math.min(100, props.differentiationScore));
  }

  static create(props: CompetitionAssessmentProps): CompetitionAssessment {
    return new CompetitionAssessment(props);
  }

  isHighlyCompetitive(): boolean {
    return (
      this.competitionLevel === CompetitionLevel.High ||
      this.competitionLevel === CompetitionLevel.Saturated
    );
  }

  isSaturated(): boolean {
    return this.competitionLevel === CompetitionLevel.Saturated;
  }
}
