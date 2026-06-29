export interface OpportunityScoreProps {
  relevance: number;
  engagement: number;
  timeliness: number;
  competition: number;
}

export class OpportunityScore {
  readonly relevance: number;
  readonly engagement: number;
  readonly timeliness: number;
  readonly competition: number;
  readonly total: number;

  private constructor(props: OpportunityScoreProps) {
    this.relevance = OpportunityScore.clamp(props.relevance);
    this.engagement = OpportunityScore.clamp(props.engagement);
    this.timeliness = OpportunityScore.clamp(props.timeliness);
    this.competition = OpportunityScore.clamp(props.competition);
    this.total = this.computeTotal();
  }

  static create(props: OpportunityScoreProps): OpportunityScore {
    return new OpportunityScore(props);
  }

  private computeTotal(): number {
    return OpportunityScore.clamp(
      this.relevance * 0.35 +
        this.engagement * 0.3 +
        this.timeliness * 0.25 +
        (100 - this.competition) * 0.1,
    );
  }

  private static clamp(value: number): number {
    return Math.max(0, Math.min(100, Math.round(value)));
  }

  toJSON(): OpportunityScoreProps & { total: number } {
    return {
      relevance: this.relevance,
      engagement: this.engagement,
      timeliness: this.timeliness,
      competition: this.competition,
      total: this.total,
    };
  }
}
