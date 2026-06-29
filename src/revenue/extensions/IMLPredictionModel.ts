import type { RevenuePrediction } from '../domain/models/RevenuePrediction';
import type { RevenueModel } from '../domain/models/RevenueModel';
import type { CostModel } from '../domain/models/CostModel';

export interface PredictionInputs {
  revenueModel: RevenueModel;
  costModel: CostModel;
  historicalData?: HistoricalMetrics;
}

export interface HistoricalMetrics {
  averageROI: number;
  averageConversionRate: number;
  averageCAC: number;
  sampleSize: number;
  periodDays: number;
}

export interface IMLPredictionModel {
  predict(inputs: PredictionInputs): Promise<RevenuePrediction>;
  isAvailable(): boolean;
}
