// Types
export {
  CreativeGoal,
  Platform,
  CreativeStrategyType,
  ContentType,
  VideoLength,
  VIDEO_LENGTH_SECONDS,
  HookStrategy,
  StoryStructure,
  CTAStrategy,
  ThumbnailStyle,
  VoiceStyle,
  MusicMood,
  VisualStyle,
  CreativePlanStatus,
} from './domain/types';

// Domain Models
export { ContentBrief } from './domain/models/ContentBrief';
export type { ContentBriefProps } from './domain/models/ContentBrief';
export { CreativeStrategy } from './domain/models/CreativeStrategy';
export type { CreativeStrategyProps } from './domain/models/CreativeStrategy';
export { PromptPackage, makeLLMPrompt, makeImagePrompt, makeVideoPrompt, makeVoicePrompt, makeMusicPrompt } from './domain/models/PromptPackage';
export type { PromptPackageProps, LLMPrompt, ImagePrompt, VideoPrompt, VoicePrompt, MusicPrompt } from './domain/models/PromptPackage';
export { ScriptPlan } from './domain/models/ScriptPlan';
export type { ScriptPlanProps, SceneDescription } from './domain/models/ScriptPlan';
export { ThumbnailPlan } from './domain/models/ThumbnailPlan';
export type { ThumbnailPlanProps } from './domain/models/ThumbnailPlan';
export { VoicePlan } from './domain/models/VoicePlan';
export type { VoicePlanProps, VoicePacing } from './domain/models/VoicePlan';
export { MusicPlan } from './domain/models/MusicPlan';
export type { MusicPlanProps } from './domain/models/MusicPlan';
export { PlatformPlan } from './domain/models/PlatformPlan';
export type { PlatformPlanProps } from './domain/models/PlatformPlan';
export { ProductionPlan } from './domain/models/ProductionPlan';
export type { ProductionPlanProps } from './domain/models/ProductionPlan';
export { CreativePlan } from './domain/models/CreativePlan';
export type { CreativePlanProps, CreateCreativePlanProps } from './domain/models/CreativePlan';

// Repository
export type { ICreativeRepository, CreativeFilter, CreativePatch } from './domain/repositories/ICreativeRepository';

// Events
export { CREATIVE_EVENT_TYPES } from './events/CreativeEvents';
export type {
  CreativeEventType,
  CreativePlanGenerated,
  PromptPackageCreated,
  ProductionPlanCreated,
  CreativePlanApproved,
  CreativePlanRejected,
} from './events/CreativeEvents';

// Strategy
export { StrategySelector } from './strategy/StrategySelector';
export type { StrategyDecision } from './strategy/StrategySelector';

// Prompts
export { PromptBuilder } from './prompts/PromptBuilder';

// Planning
export { ProductionPlanner } from './planning/ProductionPlanner';

// Application
export { CreativeIntelligenceService } from './application/CreativeIntelligenceService';
export type { GenerateCreativePlanInput } from './application/CreativeIntelligenceService';

// Infrastructure
export { SupabaseCreativeRepository } from './infrastructure/SupabaseCreativeRepository';

// Extension Points
export type { IPromptOptimizer } from './extensions/IPromptOptimizer';
export type { IThumbnailOptimizer } from './extensions/IThumbnailOptimizer';
export type { IScriptOptimizer } from './extensions/IScriptOptimizer';
export type { ITrendOptimizer, TrendSignal } from './extensions/ITrendOptimizer';
export type { IBrandGuidelineProvider, BrandGuidelines } from './extensions/IBrandGuidelineProvider';
