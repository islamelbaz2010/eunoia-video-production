import { ProductionPlan } from '../domain/models/ProductionPlan';
import { ScriptPlan } from '../domain/models/ScriptPlan';
import { ThumbnailPlan } from '../domain/models/ThumbnailPlan';
import { VoicePlan } from '../domain/models/VoicePlan';
import { MusicPlan } from '../domain/models/MusicPlan';
import { PlatformPlan } from '../domain/models/PlatformPlan';
import type { ContentBrief } from '../domain/models/ContentBrief';
import type { CreativeStrategy } from '../domain/models/CreativeStrategy';
import type { StrategyDecision } from '../strategy/StrategySelector';
import {
  VideoLength,
  VIDEO_LENGTH_SECONDS,
  ThumbnailStyle,
  MusicMood,
} from '../domain/types';

const SCENES_BY_LENGTH: Record<VideoLength, number> = {
  [VideoLength.Short15s]: 1,
  [VideoLength.Short30s]: 2,
  [VideoLength.Short60s]: 3,
  [VideoLength.Medium3m]: 5,
  [VideoLength.Medium5m]: 8,
  [VideoLength.Medium10m]: 12,
  [VideoLength.Long15m]: 16,
  [VideoLength.Long20m]: 20,
  [VideoLength.Long30mPlus]: 24,
};

const PRODUCTION_DAYS_BY_LENGTH: Record<VideoLength, number> = {
  [VideoLength.Short15s]: 1,
  [VideoLength.Short30s]: 1,
  [VideoLength.Short60s]: 2,
  [VideoLength.Medium3m]: 3,
  [VideoLength.Medium5m]: 4,
  [VideoLength.Medium10m]: 5,
  [VideoLength.Long15m]: 7,
  [VideoLength.Long20m]: 8,
  [VideoLength.Long30mPlus]: 10,
};

const PRODUCTION_ORDER = [
  'thumbnail',
  'script_outline',
  'scene_scripts',
  'voiceover',
  'visuals',
  'music',
  'assembly',
  'review',
];

export class ProductionPlanner {
  buildProductionPlan(
    brief: ContentBrief,
    strategy: CreativeStrategy,
    decision: StrategyDecision,
  ): ProductionPlan {
    const totalSeconds = VIDEO_LENGTH_SECONDS[decision.videoLength];
    const sceneCount = SCENES_BY_LENGTH[decision.videoLength] ?? 5;

    const scriptPlan = this.buildScriptPlan(brief, strategy, sceneCount, totalSeconds);
    const thumbnailPlan = this.buildThumbnailPlan(brief, strategy, decision.thumbnailStyle);
    const voicePlan = this.buildVoicePlan(strategy);
    const musicPlan = this.buildMusicPlan(strategy, totalSeconds);
    const platformPlans = this.buildPlatformPlans(brief, decision);

    return ProductionPlan.create({
      scriptPlan,
      thumbnailPlan,
      voicePlan,
      musicPlan,
      platformPlans,
      estimatedProductionDays: PRODUCTION_DAYS_BY_LENGTH[decision.videoLength] ?? 3,
      productionOrder: PRODUCTION_ORDER,
    });
  }

  private buildScriptPlan(
    brief: ContentBrief,
    strategy: CreativeStrategy,
    sceneCount: number,
    totalSeconds: number,
  ): ScriptPlan {
    const sceneDuration = Math.floor(totalSeconds / sceneCount);
    const scenes = Array.from({ length: sceneCount }, (_, i) => ({
      index: i,
      title: this.sceneTitle(i, sceneCount, strategy),
      description: `Scene ${i + 1} of ${sceneCount} for "${brief.topic}"`,
      durationSeconds: i === sceneCount - 1 ? totalSeconds - sceneDuration * (sceneCount - 1) : sceneDuration,
      visualCue: `${strategy.visualStyle} visual — ${brief.topic} scene ${i + 1}`,
      voiceoverText: this.placeholderVoiceover(i, sceneCount, brief, strategy),
    }));

    return ScriptPlan.create({
      scenes,
      totalDurationSeconds: totalSeconds,
      language: 'en',
      voiceoverStyle: strategy.voiceStyle,
    });
  }

  private buildThumbnailPlan(
    brief: ContentBrief,
    strategy: CreativeStrategy,
    thumbnailStyle: ThumbnailStyle,
  ): ThumbnailPlan {
    const colorScheme = COLOR_SCHEME_BY_STYLE[thumbnailStyle] ?? ['#ffffff', '#000000'];

    return ThumbnailPlan.create({
      style: thumbnailStyle,
      textOverlay: brief.topic.substring(0, 40),
      colorScheme,
      composition: COMPOSITION_BY_STYLE[thumbnailStyle] ?? 'centered subject with text overlay',
      imagePrompt: `Professional ${thumbnailStyle} thumbnail about "${brief.topic}", ${strategy.visualStyle} style, ${colorScheme.join(', ')} color palette`,
      moodKeywords: brief.keywords.slice(0, 3),
    });
  }

  private buildVoicePlan(strategy: CreativeStrategy): VoicePlan {
    return VoicePlan.create({
      voiceStyle: strategy.voiceStyle,
      tone: TONE_BY_VOICE_STYLE[strategy.voiceStyle] ?? 'clear and engaging',
      pacing: PACING_BY_VOICE_STYLE[strategy.voiceStyle] ?? 'medium',
      language: 'en',
      accent: null,
    });
  }

  private buildMusicPlan(strategy: CreativeStrategy, durationSeconds: number): MusicPlan {
    return MusicPlan.create({
      mood: strategy.musicMood,
      tempoBpm: TEMPO_BY_MOOD[strategy.musicMood] ?? 120,
      genre: GENRE_BY_MOOD[strategy.musicMood] ?? 'ambient',
      durationSeconds,
      energyLevel: ENERGY_BY_MOOD[strategy.musicMood] ?? 60,
    });
  }

  private buildPlatformPlans(
    brief: ContentBrief,
    decision: StrategyDecision,
  ): PlatformPlan[] {
    const primaryPlan = PlatformPlan.create({
      platform: brief.primaryPlatform,
      contentType: decision.contentType,
      videoLength: decision.videoLength,
      publishingPriority: 1,
      adaptations: [],
    });

    const additionalPlans = brief.additionalPlatforms.map((platform, i) =>
      PlatformPlan.create({
        platform,
        contentType: decision.contentType,
        videoLength: decision.videoLength,
        publishingPriority: i + 2,
        adaptations: [`Adapted from ${brief.primaryPlatform} content`],
      }),
    );

    return [primaryPlan, ...additionalPlans];
  }

  private sceneTitle(index: number, total: number, strategy: CreativeStrategy): string {
    if (index === 0) return 'Hook / Introduction';
    if (index === total - 1) return 'CTA / Conclusion';
    const structure = SCENE_NAMES_BY_STRUCTURE[strategy.storyStructure] ?? [];
    return structure[index] ?? `Main Content Scene ${index}`;
  }

  private placeholderVoiceover(
    index: number,
    total: number,
    brief: ContentBrief,
    strategy: CreativeStrategy,
  ): string {
    if (index === 0) return `[Hook: ${strategy.hookStrategy}] Introduce "${brief.topic}" compellingly.`;
    if (index === total - 1) return `[CTA: ${strategy.ctaStrategy}] ${brief.callToAction}`;
    return `[Scene ${index + 1}] Key message: ${brief.keyMessages[index % brief.keyMessages.length] ?? brief.topic}`;
  }
}

import type { VoiceStyle } from '../domain/types';

const TONE_BY_VOICE_STYLE: Record<VoiceStyle, string> = {
  professional: 'authoritative and clear',
  conversational: 'friendly and approachable',
  energetic: 'high-energy and enthusiastic',
  calm: 'soothing and measured',
  storyteller: 'warm and engaging narrative',
  narrator: 'neutral and descriptive',
};

const PACING_BY_VOICE_STYLE: Record<VoiceStyle, 'slow' | 'medium' | 'fast'> = {
  professional: 'medium',
  conversational: 'medium',
  energetic: 'fast',
  calm: 'slow',
  storyteller: 'medium',
  narrator: 'slow',
};

const GENRE_BY_MOOD: Record<MusicMood, string> = {
  [MusicMood.Upbeat]: 'pop',
  [MusicMood.Dramatic]: 'orchestral',
  [MusicMood.Inspirational]: 'cinematic',
  [MusicMood.Calm]: 'ambient',
  [MusicMood.Suspenseful]: 'thriller',
  [MusicMood.Playful]: 'indie',
};

const TEMPO_BY_MOOD: Record<MusicMood, number> = {
  [MusicMood.Upbeat]: 140,
  [MusicMood.Dramatic]: 80,
  [MusicMood.Inspirational]: 100,
  [MusicMood.Calm]: 70,
  [MusicMood.Suspenseful]: 90,
  [MusicMood.Playful]: 130,
};

const ENERGY_BY_MOOD: Record<MusicMood, number> = {
  [MusicMood.Upbeat]: 85,
  [MusicMood.Dramatic]: 70,
  [MusicMood.Inspirational]: 65,
  [MusicMood.Calm]: 30,
  [MusicMood.Suspenseful]: 55,
  [MusicMood.Playful]: 75,
};

const COLOR_SCHEME_BY_STYLE: Record<ThumbnailStyle, string[]> = {
  [ThumbnailStyle.HighContrast]: ['#FF0000', '#FFFFFF', '#000000'],
  [ThumbnailStyle.MinimalText]: ['#FFFFFF', '#1a1a1a'],
  [ThumbnailStyle.FaceClose]: ['#FF6B35', '#FFFFFF'],
  [ThumbnailStyle.SplitScreen]: ['#0066FF', '#FF6600'],
  [ThumbnailStyle.BeforeAfter]: ['#22CC44', '#CC2222'],
  [ThumbnailStyle.Reaction]: ['#FFDD00', '#FF0000'],
};

const COMPOSITION_BY_STYLE: Record<ThumbnailStyle, string> = {
  [ThumbnailStyle.HighContrast]: 'Bold text on high-contrast background with central focus',
  [ThumbnailStyle.MinimalText]: 'Clean minimal composition with subtle typography',
  [ThumbnailStyle.FaceClose]: 'Close-up face expressing emotion with text overlay',
  [ThumbnailStyle.SplitScreen]: 'Two-panel split showing contrast or comparison',
  [ThumbnailStyle.BeforeAfter]: 'Before/after split with arrow indicator',
  [ThumbnailStyle.Reaction]: 'Expressive reaction face with bold emotion text',
};

import { StoryStructure } from '../domain/types';

const SCENE_NAMES_BY_STRUCTURE: Record<StoryStructure, string[]> = {
  [StoryStructure.ThreeAct]: ['Setup', 'Confrontation', 'Resolution'],
  [StoryStructure.ProblemSolution]: ['Problem', 'Impact', 'Solution', 'Proof'],
  [StoryStructure.BeforeAfter]: ['Before State', 'Turning Point', 'After State'],
  [StoryStructure.StepByStep]: ['Step 1', 'Step 2', 'Step 3', 'Step 4', 'Step 5'],
  [StoryStructure.HeroJourney]: ['Ordinary World', 'Call to Adventure', 'Trials', 'Transformation'],
  [StoryStructure.FAB]: ['Feature Showcase', 'Advantages', 'Benefits Demonstration'],
};
