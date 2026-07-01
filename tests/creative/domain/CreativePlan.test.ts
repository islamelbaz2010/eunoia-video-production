import { CreativePlan, CreativePlanStatus } from '../../../src/creative/domain/models/CreativePlan';
import { ContentBrief } from '../../../src/creative/domain/models/ContentBrief';
import { CreativeStrategy } from '../../../src/creative/domain/models/CreativeStrategy';
import { PromptPackage } from '../../../src/creative/domain/models/PromptPackage';
import { ScriptPlan } from '../../../src/creative/domain/models/ScriptPlan';
import { ThumbnailPlan } from '../../../src/creative/domain/models/ThumbnailPlan';
import { VoicePlan } from '../../../src/creative/domain/models/VoicePlan';
import { MusicPlan } from '../../../src/creative/domain/models/MusicPlan';
import { PlatformPlan } from '../../../src/creative/domain/models/PlatformPlan';
import { ProductionPlan } from '../../../src/creative/domain/models/ProductionPlan';
import {
  CreativeGoal, Platform, CreativeStrategyType, HookStrategy, StoryStructure,
  CTAStrategy, VisualStyle, VoiceStyle, MusicMood, ThumbnailStyle, ContentType, VideoLength,
} from '../../../src/creative/domain/types';
import { CampaignType } from '../../../src/campaign/domain/models/Campaign';
import { AppError } from '../../../src/shared/errors/AppError';

function makeBrief() {
  return ContentBrief.create({
    topic: 'Test Campaign',
    goal: CreativeGoal.Education,
    primaryPlatform: Platform.YouTube,
    additionalPlatforms: [],
    targetAudience: 'developers',
    keyMessages: ['Learn fast'],
    tone: 'professional',
    callToAction: 'Subscribe now',
    keywords: ['dev', 'code'],
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
    ctaStrategy: CTAStrategy.Subscribe,
    visualStyle: VisualStyle.Modern,
    voiceStyle: VoiceStyle.Professional,
    musicMood: MusicMood.Calm,
    aiProviders: {},
  });
}

function makePromptPackage() {
  return PromptPackage.create({
    planId: 'placeholder',
    llmPrompts: [],
    imagePrompts: [],
    videoPrompts: [],
    voicePrompts: [],
    musicPrompts: [],
  });
}

function makeProductionPlan() {
  return ProductionPlan.create({
    scriptPlan: ScriptPlan.create({ scenes: [], totalDurationSeconds: 300, language: 'en', voiceoverStyle: VoiceStyle.Professional }),
    thumbnailPlan: ThumbnailPlan.create({ style: ThumbnailStyle.HighContrast, textOverlay: 'T', colorScheme: [], composition: 'c', imagePrompt: 'p', moodKeywords: [] }),
    voicePlan: VoicePlan.create({ voiceStyle: VoiceStyle.Professional, tone: 'clear', pacing: 'medium', language: 'en', accent: null }),
    musicPlan: MusicPlan.create({ mood: MusicMood.Calm, tempoBpm: 70, genre: 'ambient', durationSeconds: 300, energyLevel: 30 }),
    platformPlans: [PlatformPlan.create({ platform: Platform.YouTube, contentType: ContentType.LongFormVideo, videoLength: VideoLength.Medium5m, publishingPriority: 1, adaptations: [] })],
    estimatedProductionDays: 3,
    productionOrder: ['thumbnail', 'script'],
  });
}

function makeCreateProps(overrides = {}) {
  return {
    campaignId: 'campaign-1',
    investmentDecisionId: null,
    contentBrief: makeBrief(),
    strategy: makeStrategy(),
    promptPackage: makePromptPackage(),
    productionPlan: makeProductionPlan(),
    ...overrides,
  };
}

describe('CreativePlan', () => {
  it('create() sets Draft status and timestamps', () => {
    const plan = CreativePlan.create(makeCreateProps());
    expect(plan.status).toBe(CreativePlanStatus.Draft);
    expect(plan.id).toBeTruthy();
    expect(plan.approvedAt).toBeNull();
    expect(plan.rejectedAt).toBeNull();
    expect(plan.rejectionReason).toBeNull();
  });

  it('reconstitute() preserves all props', () => {
    const ts = new Date('2026-01-01');
    const plan = CreativePlan.reconstitute({
      ...makeCreateProps(),
      id: 'fixed-id',
      status: CreativePlanStatus.Approved,
      generatedAt: ts,
      approvedAt: ts,
      rejectedAt: null,
      rejectionReason: null,
    });
    expect(plan.id).toBe('fixed-id');
    expect(plan.status).toBe(CreativePlanStatus.Approved);
  });

  it('approve() transitions Draft to Approved', () => {
    const plan = CreativePlan.create(makeCreateProps());
    const approved = plan.approve();
    expect(approved.status).toBe(CreativePlanStatus.Approved);
    expect(approved.approvedAt).not.toBeNull();
  });

  it('approve() throws on Rejected plan', () => {
    const plan = CreativePlan.create(makeCreateProps());
    const rejected = plan.reject('low quality');
    expect(() => rejected.approve()).toThrow(AppError);
  });

  it('reject() transitions Draft to Rejected', () => {
    const plan = CreativePlan.create(makeCreateProps());
    const rejected = plan.reject('too expensive');
    expect(rejected.status).toBe(CreativePlanStatus.Rejected);
    expect(rejected.rejectionReason).toBe('too expensive');
    expect(rejected.rejectedAt).not.toBeNull();
  });

  it('reject() throws on InProduction plan', () => {
    const plan = CreativePlan.create(makeCreateProps());
    const approved = plan.approve();
    const inProd = approved.startProduction();
    expect(() => inProd.reject('reason')).toThrow(AppError);
  });

  it('startProduction() transitions Approved to InProduction', () => {
    const plan = CreativePlan.create(makeCreateProps()).approve();
    const inProd = plan.startProduction();
    expect(inProd.status).toBe(CreativePlanStatus.InProduction);
  });

  it('startProduction() throws when not Approved', () => {
    const plan = CreativePlan.create(makeCreateProps());
    expect(() => plan.startProduction()).toThrow(AppError);
  });

  it('isActive() returns true for Approved and InProduction', () => {
    const draft = CreativePlan.create(makeCreateProps());
    const approved = draft.approve();
    const inProd = approved.startProduction();
    expect(draft.isActive()).toBe(false);
    expect(approved.isActive()).toBe(true);
    expect(inProd.isActive()).toBe(true);
  });
});
