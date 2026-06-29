export interface RevenuePredictionProps {
  estimatedRevenue: number;
  estimatedProfit: number;
  estimatedROI: number;
  estimatedCAC: number;
  estimatedLTV: number;
  breakEvenPoint: number;
  paybackPeriodDays: number;
  confidenceLevel: number;
}

export class RevenuePrediction {
  readonly estimatedRevenue: number;
  readonly estimatedProfit: number;
  readonly estimatedROI: number;
  readonly estimatedCAC: number;
  readonly estimatedLTV: number;
  readonly breakEvenPoint: number;
  readonly paybackPeriodDays: number;
  readonly confidenceLevel: number;

  private constructor(props: RevenuePredictionProps) {
    this.estimatedRevenue = props.estimatedRevenue;
    this.estimatedProfit = props.estimatedProfit;
    this.estimatedROI = props.estimatedROI;
    this.estimatedCAC = props.estimatedCAC;
    this.estimatedLTV = props.estimatedLTV;
    this.breakEvenPoint = props.breakEvenPoint;
    this.paybackPeriodDays = props.paybackPeriodDays;
    this.confidenceLevel = Math.max(0, Math.min(100, props.confidenceLevel));
  }

  static create(props: RevenuePredictionProps): RevenuePrediction {
    return new RevenuePrediction(props);
  }

  isProfitable(): boolean {
    return this.estimatedProfit > 0;
  }

  isHighROI(threshold = 100): boolean {
    return this.estimatedROI >= threshold;
  }
}
