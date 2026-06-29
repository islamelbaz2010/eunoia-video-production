import { ConfigurationError } from '../../../shared/errors/AppError';
import type { ILogger } from '../../../shared/logger/ILogger';
import type { IAIProvider } from '../../application/IAIProvider';
import { CostEstimator } from '../../application/CostEstimator';
import { AIProviderError, AIProviderUnavailableError } from '../../domain/errors/AIError';
import type { AIRequest } from '../../domain/models/AIRequest';
import type { AIResponse } from '../../domain/models/AIResponse';
import { createAIResponse } from '../../domain/models/AIResponse';
import { createAIUsage } from '../../domain/models/AIUsage';
import type { ProviderCapabilities } from '../../domain/types/ProviderCapabilities';
import type { ProviderCost } from '../../domain/types/ProviderCost';
import type { ProviderHealth } from '../../domain/types/ProviderHealth';
import type { ProviderLimits } from '../../domain/types/ProviderLimits';
import { ProviderStatus } from '../../domain/types/ProviderStatus';
import { ProviderType } from '../../domain/types/ProviderType';
import { TaskType } from '../../domain/types/TaskType';
import type { FinishReason } from '../../domain/models/AIResponse';

const BASE_URL = 'https://api.openai.com/v1';

const CHAT_MODEL = 'gpt-4o';
const MINI_MODEL = 'gpt-4o-mini';
const EMBED_MODEL = 'text-embedding-3-small';

interface ModelPricing {
  input: number;
  output: number;
}

const PRICING: Record<string, ModelPricing> = {
  'gpt-4o': { input: 0.000005, output: 0.000015 },
  'gpt-4o-mini': { input: 0.00000015, output: 0.0000006 },
  'text-embedding-3-small': { input: 0.00000002, output: 0 },
};

interface OpenAIChatMessage {
  role: string;
  content: string;
}

interface OpenAIChoice {
  message: OpenAIChatMessage;
  finish_reason: string;
}

interface OpenAIUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface OpenAIChatResponse {
  choices: OpenAIChoice[];
  usage: OpenAIUsage;
}

interface OpenAIEmbeddingData {
  embedding: number[];
  index: number;
}

interface OpenAIEmbeddingResponse {
  data: OpenAIEmbeddingData[];
  usage: { prompt_tokens: number; total_tokens: number };
}

const FAST_TASK_TYPES = new Set<TaskType>([
  TaskType.Classification,
  TaskType.Scoring,
  TaskType.Analytics,
]);

const ALL_TASK_TYPES = Object.values(TaskType) as TaskType[];

export class OpenAIProvider implements IAIProvider {
  readonly type = ProviderType.OpenAI;
  readonly name = 'OpenAI';

  private apiKey: string | null = null;
  private available = false;
  private totalErrors = 0;
  private totalRequests = 0;

  private readonly estimator = new CostEstimator();

  constructor(private readonly logger: ILogger) {}

  async initialize(config: Record<string, string>): Promise<void> {
    const key = config['OPENAI_API_KEY'];
    if (key === undefined || key.length === 0) {
      throw new ConfigurationError('OpenAIProvider requires OPENAI_API_KEY in config');
    }
    this.apiKey = key;
    this.available = true;
    this.logger.info('OpenAIProvider initialized');
  }

  isAvailable(): boolean {
    return this.available;
  }

  supports(taskType: TaskType): boolean {
    return ALL_TASK_TYPES.includes(taskType);
  }

  estimateCost(request: AIRequest): ProviderCost {
    const model = this.selectModel(request.taskType);
    const pricing = PRICING[model] ?? PRICING[CHAT_MODEL]!;
    const { input, output } = this.estimator.estimateRequestTokens(request);

    return {
      provider: ProviderType.OpenAI,
      inputCostPerToken: pricing.input,
      outputCostPerToken: pricing.output,
      estimatedInputTokens: input,
      estimatedOutputTokens: output,
      estimatedTotal: input * pricing.input + output * pricing.output,
    };
  }

  estimateLatency(request: AIRequest): number {
    const { input } = this.estimator.estimateRequestTokens(request);
    return 800 + Math.ceil(input / 100) * 10;
  }

  async execute(request: AIRequest): Promise<AIResponse> {
    if (!this.available || this.apiKey === null) {
      throw new AIProviderUnavailableError(ProviderType.OpenAI);
    }

    this.totalRequests += 1;

    try {
      if (request.taskType === TaskType.Embeddings) {
        return await this.executeEmbeddings(request);
      }
      return await this.executeChatCompletion(request);
    } catch (error) {
      this.totalErrors += 1;
      throw error;
    }
  }

  async health(): Promise<ProviderHealth> {
    if (!this.available) {
      return this.buildHealth(ProviderStatus.Unavailable, 0, 'Not initialized');
    }

    const start = Date.now();
    try {
      const response = await fetch(`${BASE_URL}/models`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      const latencyMs = Date.now() - start;

      if (response.ok) {
        return this.buildHealth(ProviderStatus.Available, latencyMs, null);
      }
      return this.buildHealth(ProviderStatus.Degraded, latencyMs, `Status ${response.status}`);
    } catch {
      return this.buildHealth(ProviderStatus.Unavailable, Date.now() - start, 'Unreachable');
    }
  }

  async shutdown(): Promise<void> {
    this.available = false;
    this.apiKey = null;
    this.logger.info('OpenAIProvider shut down');
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportedTaskTypes: ALL_TASK_TYPES,
      maxInputTokens: 128_000,
      maxOutputTokens: 16_384,
      supportsStreaming: true,
      supportsSystemPrompt: true,
      supportsFunctionCalling: true,
      supportsVision: true,
      supportsEmbeddings: true,
    };
  }

  getLimits(): ProviderLimits {
    return {
      requestsPerMinute: 500,
      tokensPerMinute: 150_000,
      requestsPerDay: 10_000,
    };
  }

  private selectModel(taskType: TaskType): string {
    if (taskType === TaskType.Embeddings) return EMBED_MODEL;
    if (FAST_TASK_TYPES.has(taskType)) return MINI_MODEL;
    return CHAT_MODEL;
  }

  private async executeChatCompletion(request: AIRequest): Promise<AIResponse> {
    const start = Date.now();
    const model = this.selectModel(request.taskType);
    const messages = this.buildMessages(request);

    const body: Record<string, unknown> = { model, messages };
    if (request.maxTokens !== null) body['max_tokens'] = request.maxTokens;
    if (request.temperature !== null) body['temperature'] = request.temperature;

    const rawResponse = await this.post('/chat/completions', body);
    const data = rawResponse as OpenAIChatResponse;

    const choice = data.choices[0];
    const pricing = PRICING[model] ?? PRICING[CHAT_MODEL]!;
    const usage = createAIUsage(
      data.usage.prompt_tokens,
      data.usage.completion_tokens,
      pricing.input,
      pricing.output,
    );

    return createAIResponse({
      requestId: request.id,
      provider: ProviderType.OpenAI,
      content: choice?.message?.content ?? '',
      usage,
      latencyMs: Date.now() - start,
      finishReason: this.mapFinishReason(choice?.finish_reason ?? 'stop'),
    });
  }

  private async executeEmbeddings(request: AIRequest): Promise<AIResponse> {
    const start = Date.now();
    const pricing = PRICING[EMBED_MODEL]!;

    const rawResponse = await this.post('/embeddings', {
      model: EMBED_MODEL,
      input: request.prompt,
    });
    const data = rawResponse as OpenAIEmbeddingResponse;
    const embedding = data.data[0]?.embedding ?? [];

    const usage = createAIUsage(data.usage.prompt_tokens, 0, pricing.input, 0);

    return createAIResponse({
      requestId: request.id,
      provider: ProviderType.OpenAI,
      content: JSON.stringify(embedding),
      usage,
      latencyMs: Date.now() - start,
      finishReason: 'stop',
    });
  }

  private buildMessages(request: AIRequest): OpenAIChatMessage[] {
    const messages: OpenAIChatMessage[] = [];
    if (request.systemPrompt !== null) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    if (request.context !== null) {
      messages.push({ role: 'system', content: request.context });
    }
    messages.push({ role: 'user', content: request.prompt });
    return messages;
  }

  private async post(path: string, body: Record<string, unknown>): Promise<unknown> {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new AIProviderError(`OpenAI API error (${response.status}): ${text}`, ProviderType.OpenAI);
    }

    return response.json() as Promise<unknown>;
  }

  private mapFinishReason(reason: string): FinishReason {
    if (reason === 'length') return 'length';
    if (reason === 'stop') return 'stop';
    return 'error';
  }

  private buildHealth(
    status: ProviderStatus,
    latencyMs: number,
    message: string | null,
  ): ProviderHealth {
    const errorRate =
      this.totalRequests > 0 ? this.totalErrors / this.totalRequests : 0;
    return { provider: ProviderType.OpenAI, status, latencyMs, errorRate, lastCheckedAt: new Date(), message };
  }
}
