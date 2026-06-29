import { ClaudeProvider } from '../../../../src/ai/infrastructure/providers/ClaudeProvider';
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

describe('ClaudeProvider', () => {
  let provider: ClaudeProvider;

  beforeEach(() => {
    provider = new ClaudeProvider(makeLogger());
  });

  it('has type Claude', () => {
    expect(provider.type).toBe(ProviderType.Claude);
  });

  describe('initialize', () => {
    it('succeeds with valid API key', async () => {
      await provider.initialize({ CLAUDE_API_KEY: 'sk-ant-test' });
      expect(provider.isAvailable()).toBe(true);
    });

    it('throws ConfigurationError when key missing', async () => {
      await expect(provider.initialize({})).rejects.toThrow(ConfigurationError);
    });

    it('throws ConfigurationError when key empty', async () => {
      await expect(provider.initialize({ CLAUDE_API_KEY: '' })).rejects.toThrow(ConfigurationError);
    });
  });

  describe('isAvailable', () => {
    it('returns false before initialize', () => {
      expect(provider.isAvailable()).toBe(false);
    });

    it('returns true after initialize', async () => {
      await provider.initialize({ CLAUDE_API_KEY: 'sk-ant-test' });
      expect(provider.isAvailable()).toBe(true);
    });

    it('returns false after shutdown', async () => {
      await provider.initialize({ CLAUDE_API_KEY: 'sk-ant-test' });
      await provider.shutdown();
      expect(provider.isAvailable()).toBe(false);
    });
  });

  describe('supports', () => {
    it('supports Script task', () => {
      expect(provider.supports(TaskType.Script)).toBe(true);
    });

    it('does not support Voice task', () => {
      expect(provider.supports(TaskType.Voice)).toBe(false);
    });
  });

  describe('execute', () => {
    it('throws AIProviderNotImplementedError', async () => {
      await provider.initialize({ CLAUDE_API_KEY: 'sk-ant-test' });
      const req = createAIRequest({ taskType: TaskType.Chat, prompt: 'Hello' });
      await expect(provider.execute(req)).rejects.toThrow(AIProviderNotImplementedError);
    });
  });

  describe('health', () => {
    it('returns Unavailable when not initialized', async () => {
      const h = await provider.health();
      expect(h.status).toBe(ProviderStatus.Unavailable);
    });

    it('returns Available when initialized', async () => {
      await provider.initialize({ CLAUDE_API_KEY: 'sk-ant-test' });
      const h = await provider.health();
      expect(h.status).toBe(ProviderStatus.Available);
    });
  });

  describe('estimateCost', () => {
    it('returns cost with provider Claude', () => {
      const req = createAIRequest({ taskType: TaskType.Chat, prompt: 'Hello' });
      const cost = provider.estimateCost(req);
      expect(cost.provider).toBe(ProviderType.Claude);
    });
  });

  describe('getCapabilities / getLimits', () => {
    it('getCapabilities returns valid data', () => {
      const caps = provider.getCapabilities();
      expect(caps.maxInputTokens).toBeGreaterThan(0);
      expect(caps.supportsEmbeddings).toBe(false);
    });

    it('getLimits returns positive values', () => {
      const limits = provider.getLimits();
      expect(limits.requestsPerMinute).toBeGreaterThan(0);
    });
  });
});
