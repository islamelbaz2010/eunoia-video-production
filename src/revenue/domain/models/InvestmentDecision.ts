import { randomUUID } from 'crypto';
import type { RevenuePrediction } from './RevenuePrediction';
import type { CostModel } from './CostModel';
import type { RiskAssessment } from './RiskAssessment';
import type { CompetitionAssessment } from './CompetitionAssessment';
import type { InvestmentScore } from './InvestmentScore';
import { DecisionOutcome } from './InvestmentScore';

export { DecisionOutcome } from './InvestmentScore';

export enum DecisionSubjectType {
  Campaign = 'campaign',
  Opportunity = 'opportunity',
}

export interface InvestmentDecisionProps {
  id: string;
  subjectType: DecisionSubjectType;
  subjectId: string;
  outcome: DecisionOutcome;
  score: InvestmentScore;
  prediction: RevenuePrediction;
  costModel: CostModel;
  riskAssessment: RiskAssessment;
  competitionAssessment: CompetitionAssessment;
  recommendation: string;
  evaluatedAt: Date;
  metadata: Record<string, unknown>;
}

export type CreateInvestmentDecisionProps = Omit<InvestmentDecisionProps, 'id' | 'evaluatedAt'>;

export class InvestmentDecision {
  readonly id: string;
  readonly subjectType: DecisionSubjectType;
  readonly subjectId: string;
  readonly outcome: DecisionOutcome;
  readonly score: InvestmentScore;
  readonly prediction: RevenuePrediction;
  readonly costModel: CostModel;
  readonly riskAssessment: RiskAssessment;
  readonly competitionAssessment: CompetitionAssessment;
  readonly recommendation: string;
  readonly evaluatedAt: Date;
  readonly metadata: Readonly<Record<string, unknown>>;

  private constructor(props: InvestmentDecisionProps) {
    this.id = props.id;
    this.subjectType = props.subjectType;
    this.subjectId = props.subjectId;
    this.outcome = props.outcome;
    this.score = props.score;
    this.prediction = props.prediction;
    this.costModel = props.costModel;
    this.riskAssessment = props.riskAssessment;
    this.competitionAssessment = props.competitionAssessment;
    this.recommendation = props.recommendation;
    this.evaluatedAt = new Date(props.evaluatedAt);
    this.metadata = Object.freeze({ ...props.metadata });
  }

  static create(props: CreateInvestmentDecisionProps): InvestmentDecision {
    return new InvestmentDecision({
      ...props,
      id: randomUUID(),
      evaluatedAt: new Date(),
    });
  }

  static reconstitute(props: InvestmentDecisionProps): InvestmentDecision {
    return new InvestmentDecision(props);
  }

  isApproved(): boolean {
    return this.outcome === DecisionOutcome.GO;
  }

  isRejected(): boolean {
    return this.outcome === DecisionOutcome.NO_GO;
  }

  requiresReview(): boolean {
    return this.outcome === DecisionOutcome.REVIEW;
  }
}
