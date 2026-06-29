export enum CampaignGoalType {
  Revenue = 'revenue',
  Leads = 'leads',
  Traffic = 'traffic',
  Subscribers = 'subscribers',
  BrandAwareness = 'brand_awareness',
  Sales = 'sales',
  Affiliate = 'affiliate',
  SaaS = 'saas',
  CourseSales = 'course_sales',
}

export interface CampaignGoalProps {
  goalType: CampaignGoalType;
  description: string;
  targetValue: number;
  currentValue: number;
  achievedAt: Date | null;
}

export class CampaignGoal {
  readonly goalType: CampaignGoalType;
  readonly description: string;
  readonly targetValue: number;
  readonly currentValue: number;
  readonly achievedAt: Date | null;

  private constructor(props: CampaignGoalProps) {
    this.goalType = props.goalType;
    this.description = props.description;
    this.targetValue = props.targetValue;
    this.currentValue = props.currentValue;
    this.achievedAt = props.achievedAt !== null ? new Date(props.achievedAt) : null;
  }

  static create(props: CampaignGoalProps): CampaignGoal {
    return new CampaignGoal(props);
  }

  isAchieved(): boolean {
    return this.currentValue >= this.targetValue;
  }

  progressPct(): number {
    if (this.targetValue === 0) return 0;
    return Math.min(100, (this.currentValue / this.targetValue) * 100);
  }

  withCurrentValue(currentValue: number): CampaignGoal {
    const achievedAt =
      currentValue >= this.targetValue && this.achievedAt === null ? new Date() : this.achievedAt;
    return CampaignGoal.create({
      goalType: this.goalType,
      description: this.description,
      targetValue: this.targetValue,
      currentValue,
      achievedAt,
    });
  }
}
