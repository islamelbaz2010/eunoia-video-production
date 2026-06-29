import type { TaskType } from './TaskType';

export interface ProviderCapabilities {
  readonly supportedTaskTypes: ReadonlyArray<TaskType>;
  readonly maxInputTokens: number;
  readonly maxOutputTokens: number;
  readonly supportsStreaming: boolean;
  readonly supportsSystemPrompt: boolean;
  readonly supportsFunctionCalling: boolean;
  readonly supportsVision: boolean;
  readonly supportsEmbeddings: boolean;
}
