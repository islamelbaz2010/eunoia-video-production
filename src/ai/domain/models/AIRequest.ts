import { randomUUID } from 'crypto';
import type { TaskType } from '../types/TaskType';

export interface AIRequestProps {
  taskType: TaskType;
  prompt: string;
  systemPrompt?: string;
  context?: string;
  maxTokens?: number;
  temperature?: number;
  metadata?: Record<string, unknown>;
}

export interface AIRequest {
  readonly id: string;
  readonly taskType: TaskType;
  readonly prompt: string;
  readonly systemPrompt: string | null;
  readonly context: string | null;
  readonly maxTokens: number | null;
  readonly temperature: number | null;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly createdAt: Date;
}

export function createAIRequest(props: AIRequestProps): AIRequest {
  return {
    id: randomUUID(),
    taskType: props.taskType,
    prompt: props.prompt,
    systemPrompt: props.systemPrompt ?? null,
    context: props.context ?? null,
    maxTokens: props.maxTokens ?? null,
    temperature: props.temperature ?? null,
    metadata: Object.freeze({ ...(props.metadata ?? {}) }),
    createdAt: new Date(),
  };
}
