import { ProductionPlanner } from '../../../src/creative/planning/ProductionPlanner';
import { ContentBrief } from '../../../src/creative/domain/models/ContentBrief';
import { CreativeStrategy } from '../../../src/creative/domain/models/CreativeStrategy';
import {
  CreativeGoal, Platform, CreativeStrategyType, HookStrategy, StoryStructure,
  CTAStrategy, VisualStyle, VoiceStyle, MusicMood, ContentType, VideoLength,
} from '../../../src/creative/domain/types';
import { CampaignType } from '../../../src/campaign/domain/models/Campaign';
import { StrategyDecision } from '../../../src/creative/strategy/StrategySelector';

const planner = new ProductionPlanner();

function makeBrief(overrides = {}) {
  return ContentBrief.create({
    topic: 'Test',
    goal: CreativeGoal.Education,
    primaryPlatform: Platform.YouTube,
    additionalPlatforms: [Platform.LinkedIn],
    targetAudience: 'developers',
    keyMessages: ['Learn fast'],
    tone: 'professional',
    callToAction: 'Subscribe',
    keywords: [],
    campaignType: CampaignType.Content,
    ...overrides,
  });
}

function makeStrategy() {
  return CreativeStrategy.create({
    strategyType: CreativeStrategyType.Educational,
    title: 'Educational',
    description: 'desc',
    hookStrategy: HookStrategy.Question,
    storyStructure: StoryStructure.ProblemSolution,
    ctaStrategy: CTAStrategy.Subscribe,
    visualStyle: VisualStyle.Modern,
    voiceStyle: VoiceStyle.Professional,
    musicMood: MusicMood.Calm,
    aiProviders: {},
  });
}

function makeDecision(contentType: ContentType, videoLength: VideoLength): StrategyDecision {
  return {
    strategyType: CreativeStrategyType.Educational,
    contentType,
    videoLength,
    thumbnailStyle: 'HighContrast' as any,
  };
}

describe('ProductionPlanner.buildProductionPlan()', () => {
  it('creates a ProductionPlan with primary platform', () => {
    const plan = planner.buildProductionPlan(
      makeBrief(),
      makeStrategy(),
      makeDecision(ContentType.LongFormVideo, VideoLength.Medium10m),
    );
    expect(plan.primaryPlatformPlan()?.platform).toBe(Platform.YouTube);
  });

  it('includes all brief platforms in platformPlans', () => {
    const plan = planner.buildProductionPlan(
      makeBrief(),
      makeStrategy(),
      makeDecision(ContentType.LongFormVideo, VideoLength.Medium10m),
    );
    const platforms = plan.platformPlans.map(p => p.platform);
    expect(platforms).toContain(Platform.YouTube);
    expect(platforms).toContain(Platform.LinkedIn);
  });

  it('scene count matches SCENES_BY_LENGTH for Short15s', () => {
    const plan = planner.buildProductionPlan(
      makeBrief(),
      makeStrategy(),
      makeDecision(ContentType.Reel, VideoLength.Short15s),
    );
    expect(plan.scriptPlan.sceneCount()).toBe(1);
  });

  it('scene count matches SCENES_BY_LENGTH for Medium10m', () => {
    const plan = planner.buildProductionPlan(
      makeBrief(),
      makeStrategy(),
      makeDecision(ContentType.LongFormVideo, VideoLength.Medium10m),
    );
    expect(plan.scriptPlan.sceneCount()).toBe(12);
  });

  it('scene count matches SCENES_BY_LENGTH for Long30mPlus', () => {
    const plan = planner.buildProductionPlan(
      makeBrief(),
      makeStrategy(),
      makeDecision(ContentType.LongFormVideo, VideoLength.Long30mPlus),
    );
    expect(plan.scriptPlan.sceneCount()).toBe(24);
  });

  it('estimatedProductionDays > 0', () => {
    const plan = planner.buildProductionPlan(
      makeBrief(),
      makeStrategy(),
      makeDecision(ContentType.LongFormVideo, VideoLength.Medium5m),
    );
    expect(plan.estimatedProductionDays).toBeGreaterThan(0);
  });

  it('productionOrder is non-empty', () => {
    const plan = planner.buildProductionPlan(
      makeBrief(),
      makeStrategy(),
      makeDecision(ContentType.LongFormVideo, VideoLength.Medium5m),
    );
    expect(plan.productionOrder.length).toBeGreaterThan(0);
    expect(plan.productionOrder[0]).toBe('thumbnail');
  });

  it('produces 1 day for Short15s', () => {
    const plan = planner.buildProductionPlan(
      makeBrief(),
      makeStrategy(),
      makeDecision(ContentType.Reel, VideoLength.Short15s),
    );
    expect(plan.estimatedProductionDays).toBe(1);
  });

  it('platformPlans have sequential publishing priorities', () => {
    const plan = planner.buildProductionPlan(
      makeBrief(),
      makeStrategy(),
      makeDecision(ContentType.LongFormVideo, VideoLength.Medium10m),
    );
    const priorities = plan.platformPlans.map(p => p.publishingPriority).sort();
    expect(priorities[0]).toBe(1);
  });
});
