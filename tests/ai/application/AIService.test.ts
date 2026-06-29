import { AIService } from '../../../src/ai/application/AIService';
import { AIRouter } from '../../../src/ai/routing/AIRouter';
import { createAIRequest } from '../../../src/ai/domain/models/AIRequest';
import { createAIResponse } from '../../../src/ai/domain/models/AIResponse';
import { createAIUsage } from '../../../src/ai/domain/models/AIUsage';
import { AIRoutingError } from '../../../src/ai/domain/errors/AIError';
import { ProviderType } from '../../../src/ai/domain/types/ProviderType';
import { RoutingStrategy } from '../../../src/ai/routing/RoutingStrategy';
import { TaskType } from '../../../src/ai/domain/types/TaskType';
import type { IAIProvider } from '../../../src/ai/application/IAIProvider';
import type { ILogger } from '../../../src/shared/logger/ILogger';
import type { IMetricsService } from '../../../src/core/metrics/IMetricsService';
import type { ProviderCost } from '../../../src/ai/domain/types/ProviderCost';

function makeLogger(): jest.Mocked<ILogger> {
  return { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), child: jest.fn().mockReturnThis() } as unknown as jest.Mocked<ILogger>;
}

function makeMetrics(): jest.Mocked<IMetricsService> {
  return {
    incrementJobsExecuted: jest.fn(),
    incrementJobsFailed: jest.fn(),
    recordExecutionTime: jest.fn(),
    recordProviderLatency: jest.fn(),
    getSnapshot: jest.fn(),
  };
}

function makeCost(total: number): ProviderCost {
  return { provider: ProviderType.OpenAI, inputCostPerToken: 0, outputCostPerToken: 0, estimatedInputTokens: 0, estimatedOutputTokens: 0, estimatedTotal: total };
}

function makeProvider(executeResult: jest.Mock): jest.Mocked<IAIProvider> {
  return {
    type: ProviderType.OpenAI,
    name: 'OpenAI',
    initialize: jest.fn(),
    isAvailable: jest.fn().mockReturnValue(true),
    supports: jest.fn().mockReturnValue(true),
    estimateCost: jest.fn().mockReturnValue(makeCost(0.001)),
    estimateLatency: jest.fn().mockReturnValue(800),
    execute: executeResult,
    health: jest.fn(),
    shutdown: jest.fn(),
    getCapabilities: jest.fn(),
    getLimits: jest.fn(),
  } as unknown as jest.Mocked<IAIProvider>;
}

function makeSuccessResponse(requestId: string) {
  return createAIResponse({
    requestId,
    provider: ProviderType.OpenAI,
    content: 'Great response',
    usage: createAIUsage(10, 5, 0.000005, 0.000015),
    latencyMs: 400,
    finishReason: 'stop',
  });
}

describe('AIService', () => {
  let logger: jest.Mocked<ILogger>;
  let metrics: jest.Mocked<IMetricsService>;
  let router: AIRouter;
  let service: AIService;

  beforeEach(() => {
    logger = makeLogger();
    metrics = makeMetrics();
    router = new AIRouter(logger);
    service = new AIService(router, metrics, logger);
  });

  describe('request', () => {
    it('returns the response from the selected provider', async () => {
      const req = createAIRequest({ taskType: TaskType.Chat, prompt: 'Hello' });
      const resp = makeSuccessResponse(req.id);
      const provider = makeProvider(jest.fn().mockResolvedValue(resp));
      router.register(provider);

      const result = await service.request(req);
      expect(result.content).toBe('Great response');
    });

    it('increments jobsExecuted on success', async () => {
      const req = createAIRequest({ taskType: TaskType.Chat, prompt: 'Hello' });
      const provider = makeProvider(jest.fn().mockResolvedValue(makeSuccessResponse(req.id)));
      router.register(provider);

      await service.request(req);
      expect(metrics.incrementJobsExecuted).toHaveBeenCalledTimes(1);
    });

    it('records execution time on success', async () => {
      const req = createAIRequest({ taskType: TaskType.Chat, prompt: 'Hello' });
      const provider = makeProvider(jest.fn().mockResolvedValue(makeSuccessResponse(req.id)));
      router.register(provider);

      await service.request(req);
      expect(metrics.recordExecutionTime).toHaveBeenCalledTimes(1);
    });

    it('records provider latency on success', async () => {
      const req = createAIRequest({ taskType: TaskType.Chat, prompt: 'Hello' });
      const provider = makeProvider(jest.fn().mockResolvedValue(makeSuccessResponse(req.id)));
      router.register(provider);

      await service.request(req);
      expect(metrics.recordProviderLatency).toHaveBeenCalledWith(ProviderType.OpenAI, expect.any(Number));
    });

    it('records a trace on success', async () => {
      const req = createAIRequest({ taskType: TaskType.Chat, prompt: 'Hello' });
      const provider = makeProvider(jest.fn().mockResolvedValue(makeSuccessResponse(req.id)));
      router.register(provider);

      await service.request(req);
      expect(service.getTraces()).toHaveLength(1);
      expect(service.getTraces()[0]!.error).toBeNull();
    });

    it('throws and increments jobsFailed on routing error', async () => {
      const req = createAIRequest({ taskType: TaskType.Chat, prompt: 'Hello' });

      await expect(service.request(req)).rejects.toThrow(AIRoutingError);
      expect(metrics.incrementJobsFailed).toHaveBeenCalledTimes(1);
    });
  });

  describe('requestWithRetry', () => {
    it('retries on provider failure and succeeds', async () => {
      const req = createAIRequest({ taskType: TaskType.Chat, prompt: 'Hello' });
      const resp = makeSuccessResponse(req.id);
      const execute = jest.fn()
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValueOnce(resp);
      const provider = makeProvider(execute);
      router.register(provider);

      const result = await service.requestWithRetry(req, { strategy: RoutingStrategy.Balanced }, 1);
      expect(result.content).toBe('Great response');
      expect(execute).toHaveBeenCalledTimes(2);
    });

    it('throws after exhausting retries', async () => {
      const req = createAIRequest({ taskType: TaskType.Chat, prompt: 'Hello' });
      const execute = jest.fn().mockRejectedValue(new Error('always fails'));
      const provider = makeProvider(execute);
      router.register(provider);

      await expect(service.requestWithRetry(req, { strategy: RoutingStrategy.Balanced }, 1)).rejects.toThrow();
      expect(metrics.incrementJobsFailed).toHaveBeenCalledTimes(1);
    });

    it('records trace with retryCount > 0 when retries were needed', async () => {
      const req = createAIRequest({ taskType: TaskType.Chat, prompt: 'Hello' });
      const resp = makeSuccessResponse(req.id);
      const execute = jest.fn()
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValueOnce(resp);
      const provider = makeProvider(execute);
      router.register(provider);

      await service.requestWithRetry(req, { strategy: RoutingStrategy.Balanced }, 1);
      const trace = service.getTraces().find(t => t.retryCount > 0);
      expect(trace).toBeDefined();
    });
  });

  describe('getTraces', () => {
    it('returns read-only array', async () => {
      const req = createAIRequest({ taskType: TaskType.Chat, prompt: 'Hello' });
      const provider = makeProvider(jest.fn().mockResolvedValue(makeSuccessResponse(req.id)));
      router.register(provider);

      await service.request(req);
      const traces = service.getTraces();
      expect(Array.isArray(traces)).toBe(true);
    });
  });
});
