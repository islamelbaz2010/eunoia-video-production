import { AppError } from '../../../shared/errors/AppError';

export interface RevenueModelProps {
  expectedViews: number;
  expectedClickRate: number;
  expectedConversionRate: number;
  averageOrderValue: number;
  recurringRevenueRate: number;
  affiliateCommissionRate: number;
  sponsorshipRevenue: number;
}

export class RevenueModel {
  readonly expectedViews: number;
  readonly expectedClickRate: number;
  readonly expectedConversionRate: number;
  readonly averageOrderValue: number;
  readonly recurringRevenueRate: number;
  readonly affiliateCommissionRate: number;
  readonly sponsorshipRevenue: number;

  private constructor(props: RevenueModelProps) {
    this.expectedViews = props.expectedViews;
    this.expectedClickRate = props.expectedClickRate;
    this.expectedConversionRate = props.expectedConversionRate;
    this.averageOrderValue = props.averageOrderValue;
    this.recurringRevenueRate = props.recurringRevenueRate;
    this.affiliateCommissionRate = props.affiliateCommissionRate;
    this.sponsorshipRevenue = props.sponsorshipRevenue;
  }

  static create(props: RevenueModelProps): RevenueModel {
    if (props.expectedViews < 0) {
      throw new AppError('Expected views cannot be negative', 'VALIDATION_ERROR');
    }
    if (props.expectedClickRate < 0 || props.expectedClickRate > 1) {
      throw new AppError('Expected click rate must be between 0 and 1', 'VALIDATION_ERROR');
    }
    if (props.expectedConversionRate < 0 || props.expectedConversionRate > 1) {
      throw new AppError('Expected conversion rate must be between 0 and 1', 'VALIDATION_ERROR');
    }
    if (props.recurringRevenueRate < 0 || props.recurringRevenueRate >= 1) {
      throw new AppError('Recurring revenue rate must be between 0 and less than 1', 'VALIDATION_ERROR');
    }
    if (props.affiliateCommissionRate < 0 || props.affiliateCommissionRate > 1) {
      throw new AppError('Affiliate commission rate must be between 0 and 1', 'VALIDATION_ERROR');
    }
    return new RevenueModel(props);
  }

  static zero(): RevenueModel {
    return new RevenueModel({
      expectedViews: 0,
      expectedClickRate: 0,
      expectedConversionRate: 0,
      averageOrderValue: 0,
      recurringRevenueRate: 0,
      affiliateCommissionRate: 0,
      sponsorshipRevenue: 0,
    });
  }

  estimatedConversions(): number {
    return this.expectedViews * this.expectedClickRate * this.expectedConversionRate;
  }
}
