import type { PromptPackage } from '../domain/models/PromptPackage';
import type { ContentBrief } from '../domain/models/ContentBrief';

export interface IPromptOptimizer {
  optimize(pkg: PromptPackage, brief: ContentBrief): Promise<PromptPackage>;
  isAvailable(): boolean;
}
