import { ConfigurationError } from '../../../shared/errors/AppError';
import type { ILogger } from '../../../shared/logger/ILogger';
import type { IAIProvider } from '../../application/IAIProvider';
import { CostEstimator } from '../../application/CostEstimator';
import { AIProviderNotImplementedError } from '../../domain/errors/AIError';
import type { AIRequest } from '../../domain/models/AIRequest';
import type { AIResponse } from '../../domain/models/AIResponse';
import type { ProviderCapabilities } from '../../domain/types/ProviderCapabilities';
import type { ProviderCost } from '../../domain/types/ProviderCost';
import type { ProviderHealth } from '../../domain/types/ProviderHealth';
import type { ProviderLimits } from '../../domain/types/ProviderLimits';
import { ProviderStatus } from '../../domain/types/ProviderStatus';
import { ProviderType } from '../../domain/types/ProviderType';
import { TaskType } from '../../domain/types/TaskType';

const INPUT_COST_PER_TOKEN = 0.000003;
const OUTPUT_COST_PER_TOKEN = 0.000015;

const SUPPORTED_TASK_TYPES: ReadonlyArray<TaskType> = [
  TaskType.Script,
  TaskType.Chat,
  TaskType.Summarization,
  TaskType.Classification,
  TaskType.Scoring,
  TaskType.Discovery,
  TaskType.Analytics,
  TaskType.Translation,
  TaskType.ImagePrompt,
  TaskType.VideoPrompt,
];

export class ClaudeProvider implements IAIProvider {
  readonly type = ProviderType.Claude;
  readonly name = 'Claude';

  private apiKey: string | null = null;
  private available = false;

  private readonly estimator = new CostEstimator();

  constructor(private readonly logger: ILogger) {}

  async initialize(config: Record<string, string>): Promise<void> {
    const key = config['CLAUDE_API_KEY'];
    if (key === undefined || key.length === 0) {
      throw new ConfigurationError('ClaudeProvider requires CLAUDE_API_KEY in config');
    }
    this.apiKey = key;
    this.available = true;
    this.logger.info('ClaudeProvider initialized');
  }

  isAvailable(): boolean {
    return this.available;
  }

  supports(taskType: TaskType): boolean {
    return (SUPPORTED_TASK_TYPES as TaskType[]).includes(taskType);
  }

  estimateCost(request: AIRequest): ProviderCost {
    const { input, output } = this.estimator.estimateRequestTokens(request);
    return {
      provider: ProviderType.Claude,
      inputCostPerToken: INPUT_COST_PER_TOKEN,
      outputCostPerToken: OUTPUT_COST_PER_TOKEN,
      estimatedInputTokens: input,
      estimatedOutputTokens: output,
      estimatedTotal: input * INPUT_COST_PER_TOKEN + output * OUTPUT_COST_PER_TOKEN,
    };
  }

  estimateLatency(_request: AIRequest): number {
    return 1200;
  }

  async execute(_request: AIRequest): Promise<AIResponse> {
    throw new AIProviderNotImplementedError(ProviderType.Claude);
  }

  async health(): Promise<ProviderHealth> {
    return {
      provider: ProviderType.Claude,
      status: this.available ? ProviderStatus.Available : ProviderStatus.Unavailable,
      latencyMs: 0,
      errorRate: 0,
      lastCheckedAt: new Date(),
      message: this.available ? null : 'Not initialized',
    };
  }

  async shutdown(): Promise<void> {
    this.available = false;
    this.apiKey = null;
    this.logger.info('ClaudeProvider shut down');
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportedTaskTypes: SUPPORTED_TASK_TYPES,
      maxInputTokens: 200_000,
      maxOutputTokens: 8_192,
      supportsStreaming: true,
      supportsSystemPrompt: true,
      supportsFunctionCalling: true,
      supportsVision: true,
      supportsEmbeddings: false,
    };
  }

  getLimits(): ProviderLimits {
    return {
      requestsPerMinute: 60,
      tokensPerMinute: 100_000,
      requestsPerDay: 5_000,
    };
  }
}
