import { AIRouter } from '../../../src/ai/routing/AIRouter';
import { AIRoutingError } from '../../../src/ai/domain/errors/AIError';
import { createAIRequest } from '../../../src/ai/domain/models/AIRequest';
import { ProviderType } from '../../../src/ai/domain/types/ProviderType';
import { TaskType } from '../../../src/ai/domain/types/TaskType';
import { RoutingStrategy } from '../../../src/ai/routing/RoutingStrategy';
import type { IAIProvider } from '../../../src/ai/application/IAIProvider';
import type { ILogger } from '../../../src/shared/logger/ILogger';
import type { ProviderCost } from '../../../src/ai/domain/types/ProviderCost';

function makeLogger(): jest.Mocked<ILogger> {
  return { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), child: jest.fn().mockReturnThis() } as unknown as jest.Mocked<ILogger>;
}

function makeCost(provider: ProviderType, total: number): ProviderCost {
  return { provider, inputCostPerToken: 0, outputCostPerToken: 0, estimatedInputTokens: 0, estimatedOutputTokens: 0, estimatedTotal: total };
}

function makeProvider(type: ProviderType, opts: { available?: boolean; latency?: number; cost?: number; supports?: boolean } = {}): jest.Mocked<IAIProvider> {
  return {
    type,
    name: type,
    initialize: jest.fn(),
    isAvailable: jest.fn().mockReturnValue(opts.available ?? true),
    supports: jest.fn().mockReturnValue(opts.supports ?? true),
    estimateCost: jest.fn().mockReturnValue(makeCost(type, opts.cost ?? 0.01)),
    estimateLatency: jest.fn().mockReturnValue(opts.latency ?? 1000),
    execute: jest.fn(),
    health: jest.fn(),
    shutdown: jest.fn(),
    getCapabilities: jest.fn(),
    getLimits: jest.fn(),
  } as unknown as jest.Mocked<IAIProvider>;
}

const chatRequest = createAIRequest({ taskType: TaskType.Chat, prompt: 'Hello' });

describe('AIRouter', () => {
  let router: AIRouter;

  beforeEach(() => {
    router = new AIRouter(makeLogger());
  });

  describe('register / getProviders', () => {
    it('registers and returns providers', () => {
      const p = makeProvider(ProviderType.OpenAI);
      router.register(p);
      expect(router.getProviders()).toHaveLength(1);
    });

    it('replaces provider of same type on re-register', () => {
      router.register(makeProvider(ProviderType.OpenAI));
      router.register(makeProvider(ProviderType.OpenAI));
      expect(router.getProviders()).toHaveLength(1);
    });

    it('unregisters a provider', () => {
      router.register(makeProvider(ProviderType.OpenAI));
      router.unregister(ProviderType.OpenAI);
      expect(router.getProviders()).toHaveLength(0);
    });
  });

  describe('select', () => {
    it('throws AIRoutingError when no providers registered', () => {
      expect(() => router.select(chatRequest)).toThrow(AIRoutingError);
    });

    it('throws AIRoutingError when no provider is available', () => {
      router.register(makeProvider(ProviderType.OpenAI, { available: false }));
      expect(() => router.select(chatRequest)).toThrow(AIRoutingError);
    });

    it('throws AIRoutingError when no provider supports the task', () => {
      router.register(makeProvider(ProviderType.OpenAI, { supports: false }));
      expect(() => router.select(chatRequest)).toThrow(AIRoutingError);
    });

    it('excludes providers in policy.excludeProviders', () => {
      router.register(makeProvider(ProviderType.OpenAI));
      expect(() =>
        router.select(chatRequest, { strategy: RoutingStrategy.Balanced, excludeProviders: [ProviderType.OpenAI] }),
      ).toThrow(AIRoutingError);
    });
  });

  describe('LowestCost strategy', () => {
    it('selects the cheapest provider', () => {
      router.register(makeProvider(ProviderType.OpenAI, { cost: 0.05 }));
      router.register(makeProvider(ProviderType.Claude, { cost: 0.01 }));
      router.register(makeProvider(ProviderType.Gemini, { cost: 0.02 }));

      const selected = router.select(chatRequest, { strategy: RoutingStrategy.LowestCost });
      expect(selected.type).toBe(ProviderType.Claude);
    });
  });

  describe('HighestQuality strategy', () => {
    it('selects the highest-quality provider (Claude > OpenAI > Gemini)', () => {
      router.register(makeProvider(ProviderType.OpenAI));
      router.register(makeProvider(ProviderType.Claude));
      router.register(makeProvider(ProviderType.Gemini));

      const selected = router.select(chatRequest, { strategy: RoutingStrategy.HighestQuality });
      expect(selected.type).toBe(ProviderType.Claude);
    });
  });

  describe('Fastest strategy', () => {
    it('selects the provider with lowest latency', () => {
      router.register(makeProvider(ProviderType.OpenAI, { latency: 1000 }));
      router.register(makeProvider(ProviderType.Gemini, { latency: 300 }));

      const selected = router.select(chatRequest, { strategy: RoutingStrategy.Fastest });
      expect(selected.type).toBe(ProviderType.Gemini);
    });
  });

  describe('Manual strategy', () => {
    it('selects the preferred provider', () => {
      router.register(makeProvider(ProviderType.OpenAI));
      router.register(makeProvider(ProviderType.Claude));

      const selected = router.select(chatRequest, { strategy: RoutingStrategy.Manual, preferredProvider: ProviderType.Claude });
      expect(selected.type).toBe(ProviderType.Claude);
    });

    it('falls back to first candidate when preferred is not available', () => {
      router.register(makeProvider(ProviderType.OpenAI));
      const selected = router.select(chatRequest, { strategy: RoutingStrategy.Manual, preferredProvider: ProviderType.Gemini });
      expect(selected.type).toBe(ProviderType.OpenAI);
    });
  });

  describe('Balanced strategy', () => {
    it('selects a provider (does not throw with multiple providers)', () => {
      router.register(makeProvider(ProviderType.OpenAI, { cost: 0.01, latency: 800 }));
      router.register(makeProvider(ProviderType.Claude, { cost: 0.02, latency: 1200 }));

      expect(() => router.select(chatRequest, { strategy: RoutingStrategy.Balanced })).not.toThrow();
    });
  });
});
