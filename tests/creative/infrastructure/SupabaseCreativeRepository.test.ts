import { SupabaseCreativeRepository } from '../../../src/creative/infrastructure/SupabaseCreativeRepository';
import { ILogger } from '../../../src/shared/logger/ILogger';
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

function makeLogger(): jest.Mocked<ILogger> {
  const logger: any = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() };
  logger.child = jest.fn().mockReturnValue(logger);
  return logger;
}

function makeSupabaseClient(overrides: Record<string, any> = {}) {
  const base: Record<string, jest.Mock> = {
    from: jest.fn(),
    upsert: jest.fn(),
    select: jest.fn(),
    eq: jest.fn(),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    lte: jest.fn(),
    gte: jest.fn(),
    limit: jest.fn(),
    range: jest.fn(),
    order: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    ...overrides,
  };
  // make every fn return `base` so the chain always resolves
  Object.keys(base).forEach(k => {
    if (!['maybeSingle', 'single'].includes(k) && !(k in overrides)) {
      base[k]!.mockReturnValue(base);
    }
  });
  return base;
}

function makePlan(): CreativePlan {
  const brief = ContentBrief.create({
    topic: 'Test Campaign',
    goal: CreativeGoal.Education,
    primaryPlatform: Platform.YouTube,
    additionalPlatforms: [],
    targetAudience: 'developers',
    keyMessages: ['Learn fast'],
    tone: 'professional',
    callToAction: 'Subscribe',
    keywords: [],
    campaignType: CampaignType.Content,
  });
  const strategy = CreativeStrategy.create({
    strategyType: CreativeStrategyType.Tutorial,
    title: 'Tutorial',
    description: 'desc',
    hookStrategy: HookStrategy.Demonstration,
    storyStructure: StoryStructure.StepByStep,
    ctaStrategy: CTAStrategy.Subscribe,
    visualStyle: VisualStyle.Modern,
    voiceStyle: VoiceStyle.Professional,
    musicMood: MusicMood.Calm,
    aiProviders: {},
  });
  const promptPackage = PromptPackage.create({ planId: 'p1', llmPrompts: [], imagePrompts: [], videoPrompts: [], voicePrompts: [], musicPrompts: [] });
  const productionPlan = ProductionPlan.create({
    scriptPlan: ScriptPlan.create({ scenes: [], totalDurationSeconds: 300, language: 'en', voiceoverStyle: VoiceStyle.Professional }),
    thumbnailPlan: ThumbnailPlan.create({ style: ThumbnailStyle.HighContrast, textOverlay: 'T', colorScheme: [], composition: 'c', imagePrompt: 'p', moodKeywords: [] }),
    voicePlan: VoicePlan.create({ voiceStyle: VoiceStyle.Professional, tone: 'clear', pacing: 'medium', language: 'en', accent: null }),
    musicPlan: MusicPlan.create({ mood: MusicMood.Calm, tempoBpm: 70, genre: 'ambient', durationSeconds: 300, energyLevel: 30 }),
    platformPlans: [PlatformPlan.create({ platform: Platform.YouTube, contentType: ContentType.LongFormVideo, videoLength: VideoLength.Medium5m, publishingPriority: 1, adaptations: [] })],
    estimatedProductionDays: 3,
    productionOrder: ['thumbnail', 'script'],
  });
  return CreativePlan.reconstitute({
    id: 'plan-test',
    campaignId: 'campaign-1',
    investmentDecisionId: null,
    contentBrief: brief,
    strategy,
    promptPackage,
    productionPlan,
    status: CreativePlanStatus.Draft,
    generatedAt: new Date('2026-01-01'),
    approvedAt: null,
    rejectedAt: null,
    rejectionReason: null,
  });
}

describe('SupabaseCreativeRepository', () => {
  describe('save()', () => {
    it('calls upsert with correct table', async () => {
      const client = makeSupabaseClient();
      // single() is the terminal — make it resolve with success
      client.single!.mockResolvedValue({ data: null, error: null });
      const repo = new SupabaseCreativeRepository(client as any, makeLogger());
      // save throws on null data, so mock single to return a minimal row
      client.single!.mockResolvedValue({ data: null, error: null });
      // suppress the toDomain error by providing a valid row
      client.single!.mockResolvedValue({
        data: {
          id: 'plan-test', campaign_id: 'c1', investment_decision_id: null,
          status: 'draft', generated_at: new Date().toISOString(),
          approved_at: null, rejected_at: null, rejection_reason: null,
          content_brief: { topic: 'T', goal: 'education', primaryPlatform: 0, additionalPlatforms: [], targetAudience: 'a', keyMessages: [], tone: 't', callToAction: 'c', keywords: [], campaignType: 'content' },
          strategy: { strategyType: 0, title: 'T', description: 'd', hookStrategy: 0, storyStructure: 0, ctaStrategy: 0, visualStyle: 0, voiceStyle: 0, musicMood: 0, aiProviders: {} },
          prompt_package: { planId: 'plan-test', llmPrompts: [], imagePrompts: [], videoPrompts: [], voicePrompts: [], musicPrompts: [], generatedAt: new Date().toISOString() },
          production_plan: { scriptPlan: { scenes: [], totalDurationSeconds: 300, language: 'en', voiceoverStyle: 0 }, thumbnailPlan: { style: 0, textOverlay: '', colorScheme: [], composition: 'c', imagePrompt: 'p', moodKeywords: [] }, voicePlan: { voiceStyle: 0, tone: 't', pacing: 'medium', language: 'en', accent: null }, musicPlan: { mood: 0, tempoBpm: 70, genre: 'a', durationSeconds: 300, energyLevel: 30 }, platformPlans: [], estimatedProductionDays: 1, productionOrder: [] },
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        },
        error: null,
      });
      await repo.save(makePlan());
      expect(client.from).toHaveBeenCalledWith('creative_plans');
      expect(client.upsert).toHaveBeenCalledTimes(1);
    });

    it('throws RepositoryError on Supabase error', async () => {
      const client = makeSupabaseClient();
      client.single!.mockResolvedValue({ data: null, error: { message: 'DB error' } });
      const repo = new SupabaseCreativeRepository(client as any, makeLogger());
      await expect(repo.save(makePlan())).rejects.toThrow();
    });
  });

  describe('findById()', () => {
    it('returns null when no row found', async () => {
      const client = makeSupabaseClient();
      const repo = new SupabaseCreativeRepository(client as any, makeLogger());
      const result = await repo.findById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('count()', () => {
    it('returns 0 by default mock', async () => {
      const thenable = Promise.resolve({ count: 0, error: null });
      const selectMock = jest.fn().mockReturnValue(thenable);
      const client = makeSupabaseClient({ select: selectMock });
      const repo = new SupabaseCreativeRepository(client as any, makeLogger());
      const result = await repo.count({});
      expect(result).toBe(0);
    });
  });

  describe('delete()', () => {
    it('calls delete on correct table', async () => {
      const client = makeSupabaseClient({ delete: jest.fn().mockReturnThis(), eq: jest.fn().mockResolvedValue({ error: null }) });
      const repo = new SupabaseCreativeRepository(client as any, makeLogger());
      await repo.delete('plan-1');
      expect(client.from).toHaveBeenCalledWith('creative_plans');
    });
  });
});
