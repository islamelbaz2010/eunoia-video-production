export enum RiskLevel {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Critical = 'critical',
}

export enum RiskFactor {
  HighCompetition = 'high_competition',
  LowConfidence = 'low_confidence',
  HighProductionCost = 'high_production_cost',
  LimitedAudience = 'limited_audience',
  MissingData = 'missing_data',
  BudgetConstraints = 'budget_constraints',
}

export interface RiskAssessmentProps {
  riskLevel: RiskLevel;
  factors: RiskFactor[];
  mitigations: string[];
  overallScore: number;
}

export class RiskAssessment {
  readonly riskLevel: RiskLevel;
  readonly factors: ReadonlyArray<RiskFactor>;
  readonly mitigations: ReadonlyArray<string>;
  readonly overallScore: number;

  private constructor(props: RiskAssessmentProps) {
    this.riskLevel = props.riskLevel;
    this.factors = Object.freeze([...props.factors]);
    this.mitigations = Object.freeze([...props.mitigations]);
    this.overallScore = Math.max(0, Math.min(100, props.overallScore));
  }

  static create(props: RiskAssessmentProps): RiskAssessment {
    return new RiskAssessment(props);
  }

  hasFactor(factor: RiskFactor): boolean {
    return this.factors.includes(factor);
  }

  isCritical(): boolean {
    return this.riskLevel === RiskLevel.Critical;
  }

  isHighOrCritical(): boolean {
    return this.riskLevel === RiskLevel.High || this.riskLevel === RiskLevel.Critical;
  }
}
