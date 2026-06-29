import { RevenuePrediction } from '../domain/models/RevenuePrediction';
import type { RevenueModel } from '../domain/models/RevenueModel';
import type { CostModel } from '../domain/models/CostModel';

export class RevenuePredictionEngine {
  predict(revenueModel: RevenueModel, costModel: CostModel): RevenuePrediction {
    const conversions = revenueModel.estimatedConversions();
    const salesRevenue = conversions * revenueModel.averageOrderValue;
    const affiliateRevenue = salesRevenue * revenueModel.affiliateCommissionRate;
    const estimatedRevenue = round2(salesRevenue + affiliateRevenue + revenueModel.sponsorshipRevenue);

    const estimatedProfit = round2(estimatedRevenue - costModel.total);
    const estimatedROI =
      costModel.total > 0 ? round2((estimatedProfit / costModel.total) * 100) : 0;

    const estimatedCAC = conversions > 0 ? round2(costModel.total / conversions) : 0;

    const estimatedLTV =
      revenueModel.recurringRevenueRate > 0
        ? round2(revenueModel.averageOrderValue / (1 - revenueModel.recurringRevenueRate))
        : revenueModel.averageOrderValue;

    const breakEvenPoint =
      revenueModel.averageOrderValue > 0
        ? Math.round(costModel.total / revenueModel.averageOrderValue)
        : 0;

    const paybackPeriodDays =
      estimatedRevenue > 0 ? Math.round((costModel.total / estimatedRevenue) * 30) : 0;

    const confidenceLevel = this.calculateConfidence(revenueModel);

    return RevenuePrediction.create({
      estimatedRevenue,
      estimatedProfit,
      estimatedROI,
      estimatedCAC,
      estimatedLTV,
      breakEvenPoint,
      paybackPeriodDays,
      confidenceLevel,
    });
  }

  private calculateConfidence(model: RevenueModel): number {
    let score = 0;
    if (model.expectedViews > 0) score += 20;
    if (model.expectedClickRate > 0) score += 20;
    if (model.expectedConversionRate > 0) score += 20;
    if (model.averageOrderValue > 0) score += 20;
    if (model.sponsorshipRevenue > 0 || model.affiliateCommissionRate > 0) score += 20;
    return score;
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
