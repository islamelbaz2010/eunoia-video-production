import { CostEstimator } from '../../../src/ai/application/CostEstimator';
import { createAIRequest } from '../../../src/ai/domain/models/AIRequest';
import { TaskType } from '../../../src/ai/domain/types/TaskType';

describe('CostEstimator', () => {
  let estimator: CostEstimator;

  beforeEach(() => {
    estimator = new CostEstimator();
  });

  describe('estimateTokens', () => {
    it('returns ceil(length / 4)', () => {
      expect(estimator.estimateTokens('abcd')).toBe(1);
      expect(estimator.estimateTokens('abcde')).toBe(2);
      expect(estimator.estimateTokens('')).toBe(0);
    });

    it('handles longer strings', () => {
      const text = 'a'.repeat(100);
      expect(estimator.estimateTokens(text)).toBe(25);
    });
  });

  describe('estimateRequestTokens', () => {
    it('counts prompt tokens', () => {
      const req = createAIRequest({ taskType: TaskType.Chat, prompt: 'a'.repeat(40) });
      const { input } = estimator.estimateRequestTokens(req);
      expect(input).toBe(10);
    });

    it('includes systemPrompt tokens', () => {
      const req = createAIRequest({
        taskType: TaskType.Chat,
        prompt: 'a'.repeat(40),
        systemPrompt: 'b'.repeat(40),
      });
      const { input } = estimator.estimateRequestTokens(req);
      expect(input).toBe(20);
    });

    it('includes context tokens', () => {
      const req = createAIRequest({
        taskType: TaskType.Chat,
        prompt: 'a'.repeat(40),
        context: 'c'.repeat(40),
      });
      const { input } = estimator.estimateRequestTokens(req);
      expect(input).toBe(20);
    });

    it('uses maxTokens for output when set', () => {
      const req = createAIRequest({ taskType: TaskType.Chat, prompt: 'Hi', maxTokens: 100 });
      const { output } = estimator.estimateRequestTokens(req);
      expect(output).toBe(100);
    });

    it('defaults output to 500 when maxTokens is null', () => {
      const req = createAIRequest({ taskType: TaskType.Chat, prompt: 'Hi' });
      const { output } = estimator.estimateRequestTokens(req);
      expect(output).toBe(500);
    });
  });
});
