export enum DecisionOutcome {
  GO = 'go',
  REVIEW = 'review',
  NO_GO = 'no_go',
}

const GO_THRESHOLD = 70;
const REVIEW_THRESHOLD = 40;

export const SCORE_WEIGHTS = {
  revenuePotential: 0.25,
  riskScore: 0.20,
  competitionScore: 0.20,
  productionCostScore: 0.15,
  strategicValue: 0.10,
  goalAlignment: 0.10,
} as const;

export interface InvestmentScoreProps {
  revenuePotential: number;
  riskScore: number;
  competitionScore: number;
  productionCostScore: number;
  strategicValue: number;
  goalAlignment: number;
}

export class InvestmentScore {
  readonly revenuePotential: number;
  readonly riskScore: number;
  readonly competitionScore: number;
  readonly productionCostScore: number;
  readonly strategicValue: number;
  readonly goalAlignment: number;
  readonly total: number;
  readonly outcome: DecisionOutcome;

  private constructor(props: InvestmentScoreProps) {
    this.revenuePotential = clamp(props.revenuePotential);
    this.riskScore = clamp(props.riskScore);
    this.competitionScore = clamp(props.competitionScore);
    this.productionCostScore = clamp(props.productionCostScore);
    this.strategicValue = clamp(props.strategicValue);
    this.goalAlignment = clamp(props.goalAlignment);
    this.total = this.computeTotal();
    this.outcome = this.computeOutcome();
  }

  static create(props: InvestmentScoreProps): InvestmentScore {
    return new InvestmentScore(props);
  }

  isGo(): boolean {
    return this.outcome === DecisionOutcome.GO;
  }

  isNoGo(): boolean {
    return this.outcome === DecisionOutcome.NO_GO;
  }

  requiresReview(): boolean {
    return this.outcome === DecisionOutcome.REVIEW;
  }

  private computeTotal(): number {
    return Math.round(
      this.revenuePotential * SCORE_WEIGHTS.revenuePotential +
        this.riskScore * SCORE_WEIGHTS.riskScore +
        this.competitionScore * SCORE_WEIGHTS.competitionScore +
        this.productionCostScore * SCORE_WEIGHTS.productionCostScore +
        this.strategicValue * SCORE_WEIGHTS.strategicValue +
        this.goalAlignment * SCORE_WEIGHTS.goalAlignment,
    );
  }

  private computeOutcome(): DecisionOutcome {
    if (this.total >= GO_THRESHOLD) return DecisionOutcome.GO;
    if (this.total >= REVIEW_THRESHOLD) return DecisionOutcome.REVIEW;
    return DecisionOutcome.NO_GO;
  }
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
