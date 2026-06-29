import type { AIRequest } from '../domain/models/AIRequest';

const CHARS_PER_TOKEN = 4;
const DEFAULT_OUTPUT_TOKENS = 500;

export class CostEstimator {
  estimateTokens(text: string): number {
    return Math.ceil(text.length / CHARS_PER_TOKEN);
  }

  estimateRequestTokens(request: AIRequest): { input: number; output: number } {
    const promptTokens = this.estimateTokens(request.prompt);
    const systemTokens =
      request.systemPrompt !== null ? this.estimateTokens(request.systemPrompt) : 0;
    const contextTokens = request.context !== null ? this.estimateTokens(request.context) : 0;
    const input = promptTokens + systemTokens + contextTokens;
    const output = request.maxTokens ?? DEFAULT_OUTPUT_TOKENS;
    return { input, output };
  }
}
