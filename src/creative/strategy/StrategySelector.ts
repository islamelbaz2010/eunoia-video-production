import { CreativeStrategy } from '../domain/models/CreativeStrategy';
import {
  CreativeGoal,
  CreativeStrategyType,
  Platform,
  ContentType,
  VideoLength,
  HookStrategy,
  StoryStructure,
  CTAStrategy,
  VisualStyle,
  VoiceStyle,
  MusicMood,
  ThumbnailStyle,
} from '../domain/types';
import { ProviderType } from '../../ai/domain/types/ProviderType';
import type { CampaignType } from '../../campaign/domain/models/Campaign';

const DEFAULT_AI_PROVIDERS: Record<string, ProviderType> = {
  script: ProviderType.Claude,
  image: ProviderType.OpenAI,
  video: ProviderType.Gemini,
  voice: ProviderType.OpenAI,
  music: ProviderType.OpenAI,
};

export interface StrategyDecision {
  strategyType: CreativeStrategyType;
  contentType: ContentType;
  videoLength: VideoLength;
  thumbnailStyle: ThumbnailStyle;
}

const SHORT_FORM_PLATFORMS = new Set<Platform>([Platform.TikTok, Platform.Instagram]);
const PROFESSIONAL_PLATFORMS = new Set<Platform>([Platform.LinkedIn]);

export class StrategySelector {
  selectStrategy(
    goal: CreativeGoal,
    primaryPlatform: Platform,
    _campaignType: CampaignType,
  ): CreativeStrategy {
    const strategyType = this.resolveStrategyType(goal, primaryPlatform);
    const hookStrategy = HOOK_BY_STRATEGY[strategyType] ?? HookStrategy.Question;
    const storyStructure = STRUCTURE_BY_STRATEGY[strategyType] ?? StoryStructure.ProblemSolution;
    const ctaStrategy = CTA_BY_GOAL[goal] ?? CTAStrategy.Subscribe;
    const visualStyle = VISUAL_BY_STRATEGY[strategyType] ?? VisualStyle.Modern;
    const voiceStyle = this.resolveVoiceStyle(primaryPlatform, strategyType);
    const musicMood = MUSIC_BY_STRATEGY[strategyType] ?? MusicMood.Upbeat;

    const title = `${strategyType.replace(/_/g, ' ')} strategy`;
    const description = `${title} optimized for ${primaryPlatform} with ${goal.replace(/_/g, ' ')} goal`;

    return CreativeStrategy.create({
      strategyType,
      title,
      description,
      hookStrategy,
      storyStructure,
      ctaStrategy,
      visualStyle,
      voiceStyle,
      musicMood,
      aiProviders: { ...DEFAULT_AI_PROVIDERS },
    });
  }

  resolveContentTypeAndLength(
    goal: CreativeGoal,
    primaryPlatform: Platform,
  ): StrategyDecision {
    const strategyType = this.resolveStrategyType(goal, primaryPlatform);
    const isShortForm = SHORT_FORM_PLATFORMS.has(primaryPlatform);
    const isProfessional = PROFESSIONAL_PLATFORMS.has(primaryPlatform);

    let contentType: ContentType;
    let videoLength: VideoLength;

    if (isShortForm) {
      contentType = ContentType.Reel;
      videoLength = goal === CreativeGoal.Entertainment ? VideoLength.Short15s : VideoLength.Short60s;
    } else if (isProfessional) {
      contentType = ContentType.LongFormVideo;
      videoLength = VideoLength.Medium5m;
    } else if (primaryPlatform === Platform.YouTube) {
      contentType = ContentType.LongFormVideo;
      videoLength = this.resolveYouTubeLength(goal);
    } else if (primaryPlatform === Platform.Whop) {
      contentType = ContentType.Course;
      videoLength = VideoLength.Long15m;
    } else {
      contentType = ContentType.ShortFormVideo;
      videoLength = VideoLength.Medium3m;
    }

    return {
      strategyType,
      contentType,
      videoLength,
      thumbnailStyle: THUMBNAIL_BY_STRATEGY[strategyType] ?? ThumbnailStyle.HighContrast,
    };
  }

  private resolveStrategyType(goal: CreativeGoal, platform: Platform): CreativeStrategyType {
    const isShortForm = SHORT_FORM_PLATFORMS.has(platform);
    const isProfessional = PROFESSIONAL_PLATFORMS.has(platform);
    const isX = platform === Platform.X;

    if (isShortForm) {
      if (goal === CreativeGoal.Education || goal === CreativeGoal.SaaSConversion) {
        return CreativeStrategyType.Tutorial;
      }
      return CreativeStrategyType.ViralShort;
    }

    if (isProfessional) {
      if (goal === CreativeGoal.BrandAwareness) return CreativeStrategyType.Documentary;
      return CreativeStrategyType.Educational;
    }

    if (isX) {
      return CreativeStrategyType.News;
    }

    return STRATEGY_BY_GOAL[goal] ?? CreativeStrategyType.Educational;
  }

  private resolveVoiceStyle(platform: Platform, strategyType: CreativeStrategyType): VoiceStyle {
    if (SHORT_FORM_PLATFORMS.has(platform)) return VoiceStyle.Energetic;
    if (PROFESSIONAL_PLATFORMS.has(platform)) return VoiceStyle.Professional;
    if (strategyType === CreativeStrategyType.Documentary) return VoiceStyle.Narrator;
    if (strategyType === CreativeStrategyType.Storytelling) return VoiceStyle.Storyteller;
    if (strategyType === CreativeStrategyType.Tutorial) return VoiceStyle.Conversational;
    return VoiceStyle.Professional;
  }

  private resolveYouTubeLength(goal: CreativeGoal): VideoLength {
    switch (goal) {
      case CreativeGoal.Education:
      case CreativeGoal.SaaSConversion:
        return VideoLength.Medium10m;
      case CreativeGoal.Entertainment:
        return VideoLength.Medium5m;
      case CreativeGoal.ProductLaunch:
        return VideoLength.Medium3m;
      default:
        return VideoLength.Medium5m;
    }
  }
}

const STRATEGY_BY_GOAL: Record<CreativeGoal, CreativeStrategyType> = {
  [CreativeGoal.Education]: CreativeStrategyType.Educational,
  [CreativeGoal.Entertainment]: CreativeStrategyType.Storytelling,
  [CreativeGoal.BrandAwareness]: CreativeStrategyType.Documentary,
  [CreativeGoal.LeadGeneration]: CreativeStrategyType.ProductReview,
  [CreativeGoal.AffiliateSales]: CreativeStrategyType.Comparison,
  [CreativeGoal.SaaSConversion]: CreativeStrategyType.Tutorial,
  [CreativeGoal.ProductLaunch]: CreativeStrategyType.Storytelling,
  [CreativeGoal.CommunityGrowth]: CreativeStrategyType.Listicle,
};

const HOOK_BY_STRATEGY: Record<CreativeStrategyType, HookStrategy> = {
  [CreativeStrategyType.Educational]: HookStrategy.DataPoint,
  [CreativeStrategyType.Storytelling]: HookStrategy.Story,
  [CreativeStrategyType.Documentary]: HookStrategy.Story,
  [CreativeStrategyType.ProductReview]: HookStrategy.Demonstration,
  [CreativeStrategyType.Comparison]: HookStrategy.Question,
  [CreativeStrategyType.Tutorial]: HookStrategy.Demonstration,
  [CreativeStrategyType.ViralShort]: HookStrategy.Shock,
  [CreativeStrategyType.Listicle]: HookStrategy.Question,
  [CreativeStrategyType.News]: HookStrategy.DataPoint,
  [CreativeStrategyType.Explainer]: HookStrategy.Question,
};

const STRUCTURE_BY_STRATEGY: Record<CreativeStrategyType, StoryStructure> = {
  [CreativeStrategyType.Educational]: StoryStructure.ProblemSolution,
  [CreativeStrategyType.Storytelling]: StoryStructure.HeroJourney,
  [CreativeStrategyType.Documentary]: StoryStructure.ThreeAct,
  [CreativeStrategyType.ProductReview]: StoryStructure.BeforeAfter,
  [CreativeStrategyType.Comparison]: StoryStructure.FAB,
  [CreativeStrategyType.Tutorial]: StoryStructure.StepByStep,
  [CreativeStrategyType.ViralShort]: StoryStructure.BeforeAfter,
  [CreativeStrategyType.Listicle]: StoryStructure.StepByStep,
  [CreativeStrategyType.News]: StoryStructure.ProblemSolution,
  [CreativeStrategyType.Explainer]: StoryStructure.ProblemSolution,
};

const CTA_BY_GOAL: Record<CreativeGoal, CTAStrategy> = {
  [CreativeGoal.Education]: CTAStrategy.Subscribe,
  [CreativeGoal.Entertainment]: CTAStrategy.Subscribe,
  [CreativeGoal.BrandAwareness]: CTAStrategy.SoftSell,
  [CreativeGoal.LeadGeneration]: CTAStrategy.LeadMagnet,
  [CreativeGoal.AffiliateSales]: CTAStrategy.DirectSell,
  [CreativeGoal.SaaSConversion]: CTAStrategy.SignUp,
  [CreativeGoal.ProductLaunch]: CTAStrategy.DirectSell,
  [CreativeGoal.CommunityGrowth]: CTAStrategy.Community,
};

const VISUAL_BY_STRATEGY: Record<CreativeStrategyType, VisualStyle> = {
  [CreativeStrategyType.Educational]: VisualStyle.Minimalist,
  [CreativeStrategyType.Storytelling]: VisualStyle.Cinematic,
  [CreativeStrategyType.Documentary]: VisualStyle.Documentary,
  [CreativeStrategyType.ProductReview]: VisualStyle.Modern,
  [CreativeStrategyType.Comparison]: VisualStyle.Bold,
  [CreativeStrategyType.Tutorial]: VisualStyle.Modern,
  [CreativeStrategyType.ViralShort]: VisualStyle.Bold,
  [CreativeStrategyType.Listicle]: VisualStyle.Modern,
  [CreativeStrategyType.News]: VisualStyle.Minimalist,
  [CreativeStrategyType.Explainer]: VisualStyle.Animated,
};

const MUSIC_BY_STRATEGY: Record<CreativeStrategyType, MusicMood> = {
  [CreativeStrategyType.Educational]: MusicMood.Calm,
  [CreativeStrategyType.Storytelling]: MusicMood.Inspirational,
  [CreativeStrategyType.Documentary]: MusicMood.Dramatic,
  [CreativeStrategyType.ProductReview]: MusicMood.Upbeat,
  [CreativeStrategyType.Comparison]: MusicMood.Upbeat,
  [CreativeStrategyType.Tutorial]: MusicMood.Calm,
  [CreativeStrategyType.ViralShort]: MusicMood.Upbeat,
  [CreativeStrategyType.Listicle]: MusicMood.Playful,
  [CreativeStrategyType.News]: MusicMood.Suspenseful,
  [CreativeStrategyType.Explainer]: MusicMood.Inspirational,
};

const THUMBNAIL_BY_STRATEGY: Record<CreativeStrategyType, ThumbnailStyle> = {
  [CreativeStrategyType.Educational]: ThumbnailStyle.MinimalText,
  [CreativeStrategyType.Storytelling]: ThumbnailStyle.FaceClose,
  [CreativeStrategyType.Documentary]: ThumbnailStyle.FaceClose,
  [CreativeStrategyType.ProductReview]: ThumbnailStyle.SplitScreen,
  [CreativeStrategyType.Comparison]: ThumbnailStyle.SplitScreen,
  [CreativeStrategyType.Tutorial]: ThumbnailStyle.HighContrast,
  [CreativeStrategyType.ViralShort]: ThumbnailStyle.Reaction,
  [CreativeStrategyType.Listicle]: ThumbnailStyle.HighContrast,
  [CreativeStrategyType.News]: ThumbnailStyle.MinimalText,
  [CreativeStrategyType.Explainer]: ThumbnailStyle.HighContrast,
};
