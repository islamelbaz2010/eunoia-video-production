export interface CampaignMetricsProps {
  revenue: number;
  cost: number;
  views: number;
  clicks: number;
  conversionRate: number;
  subscribers: number;
  leads: number;
  ltv: number;
}

export class CampaignMetrics {
  readonly revenue: number;
  readonly cost: number;
  readonly roi: number;
  readonly views: number;
  readonly clicks: number;
  readonly ctr: number;
  readonly conversionRate: number;
  readonly subscribers: number;
  readonly leads: number;
  readonly cpl: number;
  readonly cac: number;
  readonly ltv: number;

  private constructor(props: CampaignMetricsProps) {
    this.revenue = props.revenue;
    this.cost = props.cost;
    this.roi = props.cost > 0 ? ((props.revenue - props.cost) / props.cost) * 100 : 0;
    this.views = props.views;
    this.clicks = props.clicks;
    this.ctr = props.views > 0 ? (props.clicks / props.views) * 100 : 0;
    this.conversionRate = props.conversionRate;
    this.subscribers = props.subscribers;
    this.leads = props.leads;
    this.cpl = props.leads > 0 ? props.cost / props.leads : 0;
    this.cac =
      props.views > 0 && props.conversionRate > 0
        ? props.cost / (props.views * (props.conversionRate / 100))
        : 0;
    this.ltv = props.ltv;
  }

  static create(props: CampaignMetricsProps): CampaignMetrics {
    return new CampaignMetrics(props);
  }

  static empty(): CampaignMetrics {
    return new CampaignMetrics({
      revenue: 0,
      cost: 0,
      views: 0,
      clicks: 0,
      conversionRate: 0,
      subscribers: 0,
      leads: 0,
      ltv: 0,
    });
  }
}
