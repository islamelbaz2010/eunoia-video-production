export interface CampaignTargetProps {
  expectedRevenue: number;
  expectedROI: number;
  expectedViews: number;
  expectedLeads: number;
  expectedSubscribers: number;
  deadline: Date;
}

export class CampaignTarget {
  readonly expectedRevenue: number;
  readonly expectedROI: number;
  readonly expectedViews: number;
  readonly expectedLeads: number;
  readonly expectedSubscribers: number;
  readonly deadline: Date;

  private constructor(props: CampaignTargetProps) {
    this.expectedRevenue = props.expectedRevenue;
    this.expectedROI = props.expectedROI;
    this.expectedViews = props.expectedViews;
    this.expectedLeads = props.expectedLeads;
    this.expectedSubscribers = props.expectedSubscribers;
    this.deadline = new Date(props.deadline);
  }

  static create(props: CampaignTargetProps): CampaignTarget {
    return new CampaignTarget(props);
  }

  isPastDeadline(): boolean {
    return new Date() > this.deadline;
  }
}
