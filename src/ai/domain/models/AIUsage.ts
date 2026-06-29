export interface AIUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly totalTokens: number;
  readonly estimatedCostUsd: number;
}

export function createAIUsage(
  inputTokens: number,
  outputTokens: number,
  costPerInputToken: number,
  costPerOutputToken: number,
): AIUsage {
  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    estimatedCostUsd: inputTokens * costPerInputToken + outputTokens * costPerOutputToken,
  };
}
