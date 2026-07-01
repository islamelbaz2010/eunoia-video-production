import { randomUUID } from 'crypto';
import type { TaskType } from '../../../ai/domain/types/TaskType';
import type { ProviderType } from '../../../ai/domain/types/ProviderType';
import type { VoiceStyle, MusicMood } from '../types';

export interface LLMPrompt {
  readonly id: string;
  readonly taskType: TaskType;
  readonly systemPrompt: string;
  readonly userPrompt: string;
  readonly context: string | null;
  readonly maxTokens: number | null;
  readonly temperature: number | null;
  readonly preferredProvider: ProviderType | null;
}

export interface ImagePrompt {
  readonly id: string;
  readonly description: string;
  readonly style: string;
  readonly aspectRatio: string;
  readonly negativePrompt: string | null;
  readonly referenceStyle: string | null;
}

export interface VideoPrompt {
  readonly id: string;
  readonly description: string;
  readonly sceneIndex: number;
  readonly durationSeconds: number;
  readonly transitions: string | null;
  readonly style: string;
}

export interface VoicePrompt {
  readonly id: string;
  readonly text: string;
  readonly voiceStyle: VoiceStyle;
  readonly language: string;
  readonly emphasis: ReadonlyArray<string>;
}

export interface MusicPrompt {
  readonly id: string;
  readonly mood: MusicMood;
  readonly genre: string;
  readonly tempoBpm: number;
  readonly durationSeconds: number;
  readonly energyLevel: number;
}

export interface PromptPackageProps {
  planId: string;
  llmPrompts: LLMPrompt[];
  imagePrompts: ImagePrompt[];
  videoPrompts: VideoPrompt[];
  voicePrompts: VoicePrompt[];
  musicPrompts: MusicPrompt[];
  generatedAt: Date;
}

export class PromptPackage {
  readonly planId: string;
  readonly llmPrompts: ReadonlyArray<LLMPrompt>;
  readonly imagePrompts: ReadonlyArray<ImagePrompt>;
  readonly videoPrompts: ReadonlyArray<VideoPrompt>;
  readonly voicePrompts: ReadonlyArray<VoicePrompt>;
  readonly musicPrompts: ReadonlyArray<MusicPrompt>;
  readonly generatedAt: Date;

  private constructor(props: PromptPackageProps) {
    this.planId = props.planId;
    this.llmPrompts = Object.freeze([...props.llmPrompts]);
    this.imagePrompts = Object.freeze([...props.imagePrompts]);
    this.videoPrompts = Object.freeze([...props.videoPrompts]);
    this.voicePrompts = Object.freeze([...props.voicePrompts]);
    this.musicPrompts = Object.freeze([...props.musicPrompts]);
    this.generatedAt = new Date(props.generatedAt);
  }

  static create(props: Omit<PromptPackageProps, 'generatedAt'>): PromptPackage {
    return new PromptPackage({ ...props, generatedAt: new Date() });
  }

  static reconstitute(props: PromptPackageProps): PromptPackage {
    return new PromptPackage(props);
  }

  totalPromptCount(): number {
    return (
      this.llmPrompts.length +
      this.imagePrompts.length +
      this.videoPrompts.length +
      this.voicePrompts.length +
      this.musicPrompts.length
    );
  }
}

export function makeLLMPrompt(
  overrides: Partial<LLMPrompt> & Pick<LLMPrompt, 'taskType' | 'systemPrompt' | 'userPrompt'>,
): LLMPrompt {
  return {
    id: randomUUID(),
    context: null,
    maxTokens: null,
    temperature: null,
    preferredProvider: null,
    ...overrides,
  };
}

export function makeImagePrompt(
  overrides: Partial<ImagePrompt> & Pick<ImagePrompt, 'description' | 'style'>,
): ImagePrompt {
  return {
    id: randomUUID(),
    aspectRatio: '16:9',
    negativePrompt: null,
    referenceStyle: null,
    ...overrides,
  };
}

export function makeVideoPrompt(
  overrides: Partial<VideoPrompt> & Pick<VideoPrompt, 'description' | 'sceneIndex' | 'durationSeconds'>,
): VideoPrompt {
  return {
    id: randomUUID(),
    transitions: null,
    style: 'cinematic',
    ...overrides,
  };
}

export function makeVoicePrompt(
  overrides: Partial<VoicePrompt> & Pick<VoicePrompt, 'text' | 'voiceStyle' | 'language'>,
): VoicePrompt {
  return {
    id: randomUUID(),
    emphasis: Object.freeze([]),
    ...overrides,
  };
}

export function makeMusicPrompt(
  overrides: Partial<MusicPrompt> & Pick<MusicPrompt, 'mood' | 'genre' | 'durationSeconds'>,
): MusicPrompt {
  return {
    id: randomUUID(),
    tempoBpm: 120,
    energyLevel: 60,
    ...overrides,
  };
}
