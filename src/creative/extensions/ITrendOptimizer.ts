import type { ContentBrief } from '../domain/models/ContentBrief';
import type { CreativeStrategy } from '../domain/models/CreativeStrategy';

export interface TrendSignal {
  keyword: string;
  trendScore: number;
  platform: string;
  peakAt: Date;
}

export interface ITrendOptimizer {
  enrichBrief(brief: ContentBrief, signals: TrendSignal[]): Promise<ContentBrief>;
  adjustStrategy(strategy: CreativeStrategy, signals: TrendSignal[]): Promise<CreativeStrategy>;
  fetchTrends(platform: string): Promise<TrendSignal[]>;
  isAvailable(): boolean;
}
