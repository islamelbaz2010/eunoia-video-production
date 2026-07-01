import { CreativeStrategy } from '../../../src/creative/domain/models/CreativeStrategy';
import {
  CreativeStrategyType,
  HookStrategy,
  StoryStructure,
  CTAStrategy,
  VisualStyle,
  VoiceStyle,
  MusicMood,
} from '../../../src/creative/domain/types';
import { ProviderType } from '../../../src/ai/domain/types/ProviderType';

function make(overrides = {}) {
  return CreativeStrategy.create({
    strategyType: CreativeStrategyType.Tutorial,
    title: 'Tutorial strategy',
    description: 'Step-by-step tutorial approach',
    hookStrategy: HookStrategy.Demonstration,
    storyStructure: StoryStructure.StepByStep,
    ctaStrategy: CTAStrategy.SignUp,
    visualStyle: VisualStyle.Modern,
    voiceStyle: VoiceStyle.Conversational,
    musicMood: MusicMood.Calm,
    aiProviders: { script: ProviderType.Claude, image: ProviderType.OpenAI },
    ...overrides,
  });
}

describe('CreativeStrategy', () => {
  it('creates with valid props', () => {
    const s = make();
    expect(s.strategyType).toBe(CreativeStrategyType.Tutorial);
    expect(s.hookStrategy).toBe(HookStrategy.Demonstration);
    expect(s.ctaStrategy).toBe(CTAStrategy.SignUp);
  });

  it('aiProviders is frozen', () => {
    const s = make();
    expect(Object.isFrozen(s.aiProviders)).toBe(true);
  });

  it('providerFor() returns provider when present', () => {
    const s = make();
    expect(s.providerFor('script')).toBe(ProviderType.Claude);
    expect(s.providerFor('image')).toBe(ProviderType.OpenAI);
  });

  it('providerFor() returns null when not present', () => {
    const s = make();
    expect(s.providerFor('music')).toBeNull();
  });
});
