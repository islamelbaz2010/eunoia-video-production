import type { ThumbnailPlan } from '../domain/models/ThumbnailPlan';
import type { ContentBrief } from '../domain/models/ContentBrief';

export interface IThumbnailOptimizer {
  optimize(plan: ThumbnailPlan, brief: ContentBrief): Promise<ThumbnailPlan>;
  isAvailable(): boolean;
}
