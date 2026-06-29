import type { AIRequest } from '../domain/models/AIRequest';
import type { AIResponse } from '../domain/models/AIResponse';
import type { ProviderCapabilities } from '../domain/types/ProviderCapabilities';
import type { ProviderCost } from '../domain/types/ProviderCost';
import type { ProviderHealth } from '../domain/types/ProviderHealth';
import type { ProviderLimits } from '../domain/types/ProviderLimits';
import type { ProviderType } from '../domain/types/ProviderType';
import type { TaskType } from '../domain/types/TaskType';

export interface IAIProvider {
  readonly type: ProviderType;
  readonly name: string;
  initialize(config: Record<string, string>): Promise<void>;
  isAvailable(): boolean;
  supports(taskType: TaskType): boolean;
  estimateCost(request: AIRequest): ProviderCost;
  estimateLatency(request: AIRequest): number;
  execute(request: AIRequest): Promise<AIResponse>;
  health(): Promise<ProviderHealth>;
  shutdown(): Promise<void>;
  getCapabilities(): ProviderCapabilities;
  getLimits(): ProviderLimits;
}
