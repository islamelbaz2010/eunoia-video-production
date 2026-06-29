import { OpenAIProvider } from '../../../../src/ai/infrastructure/providers/OpenAIProvider';
import { ConfigurationError } from '../../../../src/shared/errors/AppError';
import { AIProviderUnavailableError } from '../../../../src/ai/domain/errors/AIError';
import { createAIRequest } from '../../../../src/ai/domain/models/AIRequest';
import { ProviderType } from '../../../../src/ai/domain/types/ProviderType';
import { ProviderStatus } from '../../../../src/ai/domain/types/ProviderStatus';
import { TaskType } from '../../../../src/ai/domain/types/TaskType';
import type { ILogger } from '../../../../src/shared/logger/ILogger';

function makeLogger(): jest.Mocked<ILogger> {
  return { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), child: jest.fn().mockReturnThis() } as unknown as jest.Mocked<ILogger>;
}

function mockFetch(response: unknown, ok = true) {
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: () => Promise.resolve(response),
    text: () => Promise.resolve(JSON.stringify(response)),
  }) as unknown as typeof fetch;
}

const chatResponse = {
  choices: [{ message: { role: 'assistant', content: 'Hello!' }, finish_reason: 'stop' }],
  usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
};

const embeddingResponse = {
  data: [{ embedding: [0.1, 0.2, 0.3], index: 0 }],
  usage: { prompt_tokens: 5, total_tokens: 5 },
};

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;
  const originalFetch = global.fetch;

  beforeEach(() => {
    provider = new OpenAIProvider(makeLogger());
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('has type OpenAI', () => {
    expect(provider.type).toBe(ProviderType.OpenAI);
  });

  describe('initialize', () => {
    it('succeeds with valid API key', async () => {
      await provider.initialize({ OPENAI_API_KEY: 'sk-test' });
      expect(provider.isAvailable()).toBe(true);
    });

    it('throws ConfigurationError when key is missing', async () => {
      await expect(provider.initialize({})).rejects.toThrow(ConfigurationError);
    });

    it('throws ConfigurationError when key is empty', async () => {
      await expect(provider.initialize({ OPENAI_API_KEY: '' })).rejects.toThrow(ConfigurationError);
    });
  });

  describe('isAvailable', () => {
    it('returns false before initialize', () => {
      expect(provider.isAvailable()).toBe(false);
    });

    it('returns true after initialize', async () => {
      await provider.initialize({ OPENAI_API_KEY: 'sk-test' });
      expect(provider.isAvailable()).toBe(true);
    });

    it('returns false after shutdown', async () => {
      await provider.initialize({ OPENAI_API_KEY: 'sk-test' });
      await provider.shutdown();
      expect(provider.isAvailable()).toBe(false);
    });
  });

  describe('supports', () => {
    it('supports all TaskTypes', () => {
      for (const t of Object.values(TaskType)) {
        expect(provider.supports(t)).toBe(true);
      }
    });
  });

  describe('execute', () => {
    it('throws AIProviderUnavailableError when not initialized', async () => {
      const req = createAIRequest({ taskType: TaskType.Chat, prompt: 'Hi' });
      await expect(provider.execute(req)).rejects.toThrow(AIProviderUnavailableError);
    });

    it('executes chat completion and returns AIResponse', async () => {
      await provider.initialize({ OPENAI_API_KEY: 'sk-test' });
      mockFetch(chatResponse);

      const req = createAIRequest({ taskType: TaskType.Chat, prompt: 'Hello' });
      const res = await provider.execute(req);

      expect(res.content).toBe('Hello!');
      expect(res.provider).toBe(ProviderType.OpenAI);
      expect(res.finishReason).toBe('stop');
    });

    it('executes embeddings task and returns JSON content', async () => {
      await provider.initialize({ OPENAI_API_KEY: 'sk-test' });
      mockFetch(embeddingResponse);

      const req = createAIRequest({ taskType: TaskType.Embeddings, prompt: 'embed this' });
      const res = await provider.execute(req);

      expect(() => JSON.parse(res.content)).not.toThrow();
    });

    it('passes systemPrompt as system message', async () => {
      await provider.initialize({ OPENAI_API_KEY: 'sk-test' });
      mockFetch(chatResponse);

      const req = createAIRequest({ taskType: TaskType.Chat, prompt: 'Hi', systemPrompt: 'Be concise' });
      await provider.execute(req);

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body as string);
      expect(body.messages[0].role).toBe('system');
      expect(body.messages[0].content).toBe('Be concise');
    });

    it('throws AIProviderError on API error', async () => {
      await provider.initialize({ OPENAI_API_KEY: 'sk-test' });
      mockFetch({ error: 'Unauthorized' }, false);

      const req = createAIRequest({ taskType: TaskType.Chat, prompt: 'Hi' });
      await expect(provider.execute(req)).rejects.toThrow();
    });
  });

  describe('estimateCost', () => {
    it('returns a ProviderCost with positive estimates', () => {
      const req = createAIRequest({ taskType: TaskType.Chat, prompt: 'a'.repeat(400) });
      const cost = provider.estimateCost(req);
      expect(cost.provider).toBe(ProviderType.OpenAI);
      expect(cost.estimatedTotal).toBeGreaterThan(0);
    });
  });

  describe('estimateLatency', () => {
    it('returns a positive number', () => {
      const req = createAIRequest({ taskType: TaskType.Chat, prompt: 'Hi' });
      expect(provider.estimateLatency(req)).toBeGreaterThan(0);
    });
  });

  describe('health', () => {
    it('returns Unavailable when not initialized', async () => {
      const h = await provider.health();
      expect(h.status).toBe(ProviderStatus.Unavailable);
    });

    it('returns Available when API responds ok', async () => {
      await provider.initialize({ OPENAI_API_KEY: 'sk-test' });
      global.fetch = jest.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch;

      const h = await provider.health();
      expect(h.status).toBe(ProviderStatus.Available);
    });

    it('returns Unavailable when API throws', async () => {
      await provider.initialize({ OPENAI_API_KEY: 'sk-test' });
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error')) as unknown as typeof fetch;

      const h = await provider.health();
      expect(h.status).toBe(ProviderStatus.Unavailable);
    });
  });

  describe('getCapabilities', () => {
    it('returns capabilities with all task types', () => {
      const caps = provider.getCapabilities();
      expect(caps.supportedTaskTypes.length).toBeGreaterThan(0);
      expect(caps.maxInputTokens).toBeGreaterThan(0);
    });
  });

  describe('getLimits', () => {
    it('returns positive limits', () => {
      const limits = provider.getLimits();
      expect(limits.requestsPerMinute).toBeGreaterThan(0);
      expect(limits.tokensPerMinute).toBeGreaterThan(0);
    });
  });
});
