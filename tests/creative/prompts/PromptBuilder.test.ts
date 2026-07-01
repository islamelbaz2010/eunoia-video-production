import { PromptBuilder } from '../../../src/creative/prompts/PromptBuilder';
import { ContentBrief } from '../../../src/creative/domain/models/ContentBrief';
import { CreativeStrategy } from '../../../src/creative/domain/models/CreativeStrategy';
import { ScriptPlan } from '../../../src/creative/domain/models/ScriptPlan';
import {
  CreativeGoal, Platform, CreativeStrategyType, HookStrategy, StoryStructure,
  CTAStrategy, VisualStyle, VoiceStyle, MusicMood,
} from '../../../src/creative/domain/types';
import { CampaignType } from '../../../src/campaign/domain/models/Campaign';
import { ProviderType } from '../../../src/ai/domain/types/ProviderType';

const builder = new PromptBuilder();

function makeBrief() {
  return ContentBrief.create({
    topic: 'Build a SaaS in 30 Days',
    goal: CreativeGoal.SaaSConversion,
    primaryPlatform: Platform.YouTube,
    additionalPlatforms: [],
    targetAudience: 'indie hackers',
    keyMessages: ['Ship fast', 'Get users'],
    tone: 'conversational',
    callToAction: 'Start building today',
    keywords: ['saas', 'startup'],
    campaignType: CampaignType.Content,
  });
}

function makeStrategy() {
  return CreativeStrategy.create({
    strategyType: CreativeStrategyType.Tutorial,
    title: 'Tutorial strategy',
    description: 'description',
    hookStrategy: HookStrategy.Demonstration,
    storyStructure: StoryStructure.StepByStep,
    ctaStrategy: CTAStrategy.SignUp,
    visualStyle: VisualStyle.Modern,
    voiceStyle: VoiceStyle.Conversational,
    musicMood: MusicMood.Upbeat,
    aiProviders: { script: ProviderType.Claude, image: ProviderType.OpenAI },
  });
}

function makeScript(sceneCount: number) {
  const scenes = Array.from({ length: sceneCount }, (_, i) => ({
    index: i,
    title: `Scene ${i}`,
    description: `Description ${i}`,
    durationSeconds: 60,
    visualCue: 'wide shot',
    voiceoverText: `Voiceover for scene ${i}`,
  }));
  return ScriptPlan.create({ scenes, totalDurationSeconds: sceneCount * 60, language: 'en', voiceoverStyle: VoiceStyle.Conversational });
}

describe('PromptBuilder.buildPromptPackage()', () => {
  it('returns a PromptPackage with correct planId', () => {
    const pkg = builder.buildPromptPackage('plan-abc', makeBrief(), makeStrategy(), makeScript(3));
    expect(pkg.planId).toBe('plan-abc');
  });

  it('creates LLM prompts: 1 outline + N scene prompts', () => {
    const pkg = builder.buildPromptPackage('plan-1', makeBrief(), makeStrategy(), makeScript(3));
    expect(pkg.llmPrompts.length).toBe(4); // 1 outline + 3 scenes
  });

  it('creates 1 image prompt (thumbnail)', () => {
    const pkg = builder.buildPromptPackage('plan-1', makeBrief(), makeStrategy(), makeScript(2));
    expect(pkg.imagePrompts).toHaveLength(1);
  });

  it('creates N video prompts matching scene count', () => {
    const pkg = builder.buildPromptPackage('plan-1', makeBrief(), makeStrategy(), makeScript(4));
    expect(pkg.videoPrompts).toHaveLength(4);
  });

  it('creates N voice prompts matching scene count', () => {
    const pkg = builder.buildPromptPackage('plan-1', makeBrief(), makeStrategy(), makeScript(2));
    expect(pkg.voicePrompts).toHaveLength(2);
  });

  it('creates 1 music prompt', () => {
    const pkg = builder.buildPromptPackage('plan-1', makeBrief(), makeStrategy(), makeScript(3));
    expect(pkg.musicPrompts).toHaveLength(1);
  });

  it('totalPromptCount() matches expected total', () => {
    const scenes = 5;
    const pkg = builder.buildPromptPackage('plan-1', makeBrief(), makeStrategy(), makeScript(scenes));
    // 1 outline + scenes LLM + 1 image + scenes video + scenes voice + 1 music
    const expected = 1 + scenes + 1 + scenes + scenes + 1;
    expect(pkg.totalPromptCount()).toBe(expected);
  });

  it('handles 0 scenes gracefully', () => {
    const pkg = builder.buildPromptPackage('plan-1', makeBrief(), makeStrategy(), makeScript(0));
    expect(pkg.llmPrompts.length).toBe(1); // just outline
    expect(pkg.videoPrompts.length).toBe(0);
    expect(pkg.voicePrompts.length).toBe(0);
  });

  it('video prompts have correct sceneIndex', () => {
    const pkg = builder.buildPromptPackage('plan-1', makeBrief(), makeStrategy(), makeScript(3));
    const indexes = pkg.videoPrompts.map(p => p.sceneIndex);
    expect(indexes).toEqual([0, 1, 2]);
  });

  it('music prompt reflects strategy musicMood', () => {
    const pkg = builder.buildPromptPackage('plan-1', makeBrief(), makeStrategy(), makeScript(1));
    expect(pkg.musicPrompts[0]?.mood).toBe(MusicMood.Upbeat);
  });
});
