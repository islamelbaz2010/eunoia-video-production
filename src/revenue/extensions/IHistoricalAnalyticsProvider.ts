import type { HistoricalMetrics } from './IMLPredictionModel';

export interface IHistoricalAnalyticsProvider {
  getHistoricalPerformance(campaignType: string): Promise<HistoricalMetrics | null>;
  getAverageROI(campaignType: string, periodDays: number): Promise<number | null>;
  getAverageConversionRate(campaignType: string, periodDays: number): Promise<number | null>;
}
