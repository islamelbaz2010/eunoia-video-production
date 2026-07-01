import type {
  CreativeStrategyType,
  HookStrategy,
  StoryStructure,
  CTAStrategy,
  VisualStyle,
  VoiceStyle,
  MusicMood,
} from '../types';
import type { ProviderType } from '../../../ai/domain/types/ProviderType';

export interface CreativeStrategyProps {
  strategyType: CreativeStrategyType;
  title: string;
  description: string;
  hookStrategy: HookStrategy;
  storyStructure: StoryStructure;
  ctaStrategy: CTAStrategy;
  visualStyle: VisualStyle;
  voiceStyle: VoiceStyle;
  musicMood: MusicMood;
  aiProviders: Record<string, ProviderType>;
}

export class CreativeStrategy {
  readonly strategyType: CreativeStrategyType;
  readonly title: string;
  readonly description: string;
  readonly hookStrategy: HookStrategy;
  readonly storyStructure: StoryStructure;
  readonly ctaStrategy: CTAStrategy;
  readonly visualStyle: VisualStyle;
  readonly voiceStyle: VoiceStyle;
  readonly musicMood: MusicMood;
  readonly aiProviders: Readonly<Record<string, ProviderType>>;

  private constructor(props: CreativeStrategyProps) {
    this.strategyType = props.strategyType;
    this.title = props.title;
    this.description = props.description;
    this.hookStrategy = props.hookStrategy;
    this.storyStructure = props.storyStructure;
    this.ctaStrategy = props.ctaStrategy;
    this.visualStyle = props.visualStyle;
    this.voiceStyle = props.voiceStyle;
    this.musicMood = props.musicMood;
    this.aiProviders = Object.freeze({ ...props.aiProviders });
  }

  static create(props: CreativeStrategyProps): CreativeStrategy {
    return new CreativeStrategy(props);
  }

  providerFor(task: string): ProviderType | null {
    return this.aiProviders[task] ?? null;
  }
}
