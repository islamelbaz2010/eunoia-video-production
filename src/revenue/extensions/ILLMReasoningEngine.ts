import type { InvestmentDecision } from '../domain/models/InvestmentDecision';

export interface ReasoningContext {
  decision: InvestmentDecision;
  additionalContext?: Record<string, unknown>;
}

export interface ILLMReasoningEngine {
  reason(context: ReasoningContext): Promise<string>;
  isAvailable(): boolean;
}
