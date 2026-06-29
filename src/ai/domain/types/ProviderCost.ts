import type { ProviderType } from './ProviderType';

export interface ProviderCost {
  readonly provider: ProviderType;
  readonly inputCostPerToken: number;
  readonly outputCostPerToken: number;
  readonly estimatedInputTokens: number;
  readonly estimatedOutputTokens: number;
  readonly estimatedTotal: number;
}
