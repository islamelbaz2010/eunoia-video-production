import type { ILogger } from '../../shared/logger/ILogger';
import type { IMetricsService } from '../../core/metrics/IMetricsService';
import type { AIRequest } from '../domain/models/AIRequest';
import type { AIResponse } from '../domain/models/AIResponse';
import { AIRoutingError } from '../domain/errors/AIError';
import type { RequestTrace } from '../observability/RequestTrace';
import type { AIRouter } from '../routing/AIRouter';
import { type RoutingPolicy, DEFAULT_ROUTING_POLICY } from '../routing/RoutingPolicy';

const DEFAULT_MAX_RETRIES = 2;

export class AIService {
  private readonly traces: RequestTrace[] = [];

  constructor(
    private readonly router: AIRouter,
    private readonly metrics: IMetricsService,
    private readonly logger: ILogger,
  ) {}

  async request(
    aiRequest: AIRequest,
    policy: RoutingPolicy = DEFAULT_ROUTING_POLICY,
  ): Promise<AIResponse> {
    return this.executeWithRetry(aiRequest, policy, 0);
  }

  async requestWithRetry(
    aiRequest: AIRequest,
    policy: RoutingPolicy = DEFAULT_ROUTING_POLICY,
    maxRetries: number = DEFAULT_MAX_RETRIES,
  ): Promise<AIResponse> {
    return this.executeWithRetry(aiRequest, policy, maxRetries);
  }

  getTraces(): ReadonlyArray<RequestTrace> {
    return this.traces;
  }

  private async executeWithRetry(
    aiRequest: AIRequest,
    policy: RoutingPolicy,
    maxRetries: number,
  ): Promise<AIResponse> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const start = Date.now();

      try {
        const provider = this.router.select(aiRequest, policy);

        this.logger.debug(
          { requestId: aiRequest.id, provider: provider.type, attempt },
          'Executing AI request',
        );

        const response = await provider.execute(aiRequest);
        const latencyMs = Date.now() - start;

        this.metrics.incrementJobsExecuted();
        this.metrics.recordExecutionTime(latencyMs);
        this.metrics.recordProviderLatency(provider.type, latencyMs);

        this.recordTrace({
          requestId: aiRequest.id,
          provider: provider.type,
          taskType: aiRequest.taskType,
          latencyMs,
          inputTokens: response.usage.inputTokens,
          outputTokens: response.usage.outputTokens,
          estimatedCostUsd: response.usage.estimatedCostUsd,
          error: null,
          retryCount: attempt,
          timestamp: new Date(),
        });

        return response;
      } catch (error) {
        lastError = error;
        const latencyMs = Date.now() - start;

        if (error instanceof AIRoutingError) {
          this.metrics.incrementJobsFailed();
          this.recordTrace({
            requestId: aiRequest.id,
            provider: 'unknown' as never,
            taskType: aiRequest.taskType,
            latencyMs,
            inputTokens: 0,
            outputTokens: 0,
            estimatedCostUsd: 0,
            error: error.message,
            retryCount: attempt,
            timestamp: new Date(),
          });
          throw error;
        }

        this.logger.warn(
          { requestId: aiRequest.id, attempt, error },
          'AI request attempt failed',
        );

        if (attempt === maxRetries) {
          this.metrics.incrementJobsFailed();
          this.recordTrace({
            requestId: aiRequest.id,
            provider: 'unknown' as never,
            taskType: aiRequest.taskType,
            latencyMs,
            inputTokens: 0,
            outputTokens: 0,
            estimatedCostUsd: 0,
            error: error instanceof Error ? error.message : String(error),
            retryCount: attempt,
            timestamp: new Date(),
          });
        }
      }
    }

    throw lastError;
  }

  private recordTrace(trace: RequestTrace): void {
    this.traces.push(trace);
    this.logger.debug({ trace }, 'AI request trace recorded');
  }
}
