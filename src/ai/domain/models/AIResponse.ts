import { randomUUID } from 'crypto';
import type { AIUsage } from './AIUsage';
import type { ProviderType } from '../types/ProviderType';

export type FinishReason = 'stop' | 'length' | 'error';

export interface AIResponseProps {
  requestId: string;
  provider: ProviderType;
  content: string;
  usage: AIUsage;
  latencyMs: number;
  finishReason: FinishReason;
  metadata?: Record<string, unknown>;
}

export interface AIResponse {
  readonly id: string;
  readonly requestId: string;
  readonly provider: ProviderType;
  readonly content: string;
  readonly usage: AIUsage;
  readonly latencyMs: number;
  readonly finishReason: FinishReason;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly createdAt: Date;
}

export function createAIResponse(props: AIResponseProps): AIResponse {
  return {
    id: randomUUID(),
    requestId: props.requestId,
    provider: props.provider,
    content: props.content,
    usage: props.usage,
    latencyMs: props.latencyMs,
    finishReason: props.finishReason,
    metadata: Object.freeze({ ...(props.metadata ?? {}) }),
    createdAt: new Date(),
  };
}
