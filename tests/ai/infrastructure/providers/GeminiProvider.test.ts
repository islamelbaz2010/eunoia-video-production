import { GeminiProvider } from '../../../../src/ai/infrastructure/providers/GeminiProvider';
import { ConfigurationError } from '../../../../src/shared/errors/AppError';
import { AIProviderNotImplementedError } from '../../../../src/ai/domain/errors/AIError';
import { createAIRequest } from '../../../../src/ai/domain/models/AIRequest';
import { ProviderType } from '../../../../src/ai/domain/types/ProviderType';
import { ProviderStatus } from '../../../../src/ai/domain/types/ProviderStatus';
import { TaskType } from '../../../../src/ai/domain/types/TaskType';
import type { ILogger } from '../../../../src/shared/logger/ILogger';

function makeLogger(): jest.Mocked<ILogger> {
  return { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), child: jest.fn().mockReturnThis() } as unknown as jest.Mocked<ILogger>;
}

describe('GeminiProvider', () => {
  let provider: GeminiProvider;

  beforeEach(() => {
    provider = new GeminiProvider(makeLogger());
  });

  it('has type Gemini', () => {
    expect(provider.type).toBe(ProviderType.Gemini);
  });

  describe('initialize', () => {
    it('succeeds with valid API key', async () => {
      await provider.initialize({ GEMINI_API_KEY: 'gm-test' });
      expect(provider.isAvailable()).toBe(true);
    });

    it('throws ConfigurationError when key missing', async () => {
      await expect(provider.initialize({})).rejects.toThrow(ConfigurationError);
    });

    it('throws ConfigurationError when key empty', async () => {
      await expect(provider.initialize({ GEMINI_API_KEY: '' })).rejects.toThrow(ConfigurationError);
    });
  });

  describe('isAvailable', () => {
    it('returns false before initialize', () => {
      expect(provider.isAvailable()).toBe(false);
    });

    it('returns true after initialize', async () => {
      await provider.initialize({ GEMINI_API_KEY: 'gm-test' });
      expect(provider.isAvailable()).toBe(true);
    });

    it('returns false after shutdown', async () => {
      await provider.initialize({ GEMINI_API_KEY: 'gm-test' });
      await provider.shutdown();
      expect(provider.isAvailable()).toBe(false);
    });
  });

  describe('supports', () => {
    it('supports Chat task', () => {
      expect(provider.supports(TaskType.Chat)).toBe(true);
    });

    it('does not support Voice task', () => {
      expect(provider.supports(TaskType.Voice)).toBe(false);
    });
  });

  describe('execute', () => {
    it('throws AIProviderNotImplementedError', async () => {
      await provider.initialize({ GEMINI_API_KEY: 'gm-test' });
      const req = createAIRequest({ taskType: TaskType.Chat, prompt: 'Hello' });
      await expect(provider.execute(req)).rejects.toThrow(AIProviderNotImplementedError);
    });
  });

  describe('health', () => {
    it('returns Unavailable when not initialized', async () => {
      const h = await provider.health();
      expect(h.status).toBe(ProviderStatus.Unavailable);
    });

    it('returns Available after initialize', async () => {
      await provider.initialize({ GEMINI_API_KEY: 'gm-test' });
      const h = await provider.health();
      expect(h.status).toBe(ProviderStatus.Available);
    });
  });

  describe('estimateCost', () => {
    it('returns cost with provider Gemini', () => {
      const req = createAIRequest({ taskType: TaskType.Chat, prompt: 'Hello' });
      const cost = provider.estimateCost(req);
      expect(cost.provider).toBe(ProviderType.Gemini);
    });
  });

  describe('getCapabilities', () => {
    it('returns capabilities supporting embeddings', () => {
      expect(provider.getCapabilities().supportsEmbeddings).toBe(true);
    });

    it('has very large maxInputTokens', () => {
      expect(provider.getCapabilities().maxInputTokens).toBeGreaterThanOrEqual(1_000_000);
    });
  });

  describe('getLimits', () => {
    it('returns valid limits', () => {
      const limits = provider.getLimits();
      expect(limits.requestsPerMinute).toBeGreaterThan(0);
      expect(limits.tokensPerMinute).toBeGreaterThan(0);
    });
  });
});
