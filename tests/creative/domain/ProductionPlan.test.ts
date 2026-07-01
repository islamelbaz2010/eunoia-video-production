import { ProductionPlan } from '../../../src/creative/domain/models/ProductionPlan';
import { ScriptPlan } from '../../../src/creative/domain/models/ScriptPlan';
import { ThumbnailPlan } from '../../../src/creative/domain/models/ThumbnailPlan';
import { VoicePlan } from '../../../src/creative/domain/models/VoicePlan';
import { MusicPlan } from '../../../src/creative/domain/models/MusicPlan';
import { PlatformPlan } from '../../../src/creative/domain/models/PlatformPlan';
import { VoiceStyle, MusicMood, ThumbnailStyle, Platform, ContentType, VideoLength } from '../../../src/creative/domain/types';

function makeScript() {
  return ScriptPlan.create({
    scenes: [],
    totalDurationSeconds: 300,
    language: 'en',
    voiceoverStyle: VoiceStyle.Professional,
  });
}

function makeThumbnail() {
  return ThumbnailPlan.create({
    style: ThumbnailStyle.HighContrast,
    textOverlay: 'Test',
    colorScheme: ['#fff'],
    composition: 'centered',
    imagePrompt: 'prompt',
    moodKeywords: [],
  });
}

function makeVoice() {
  return VoicePlan.create({
    voiceStyle: VoiceStyle.Professional,
    tone: 'clear',
    pacing: 'medium',
    language: 'en',
    accent: null,
  });
}

function makeMusic() {
  return MusicPlan.create({
    mood: MusicMood.Calm,
    tempoBpm: 70,
    genre: 'ambient',
    durationSeconds: 300,
    energyLevel: 30,
  });
}

function makePlatformPlan(priority: number) {
  return PlatformPlan.create({
    platform: priority === 1 ? Platform.YouTube : Platform.LinkedIn,
    contentType: ContentType.LongFormVideo,
    videoLength: VideoLength.Medium5m,
    publishingPriority: priority,
    adaptations: [],
  });
}

function makePlan(overrides = {}) {
  return ProductionPlan.create({
    scriptPlan: makeScript(),
    thumbnailPlan: makeThumbnail(),
    voicePlan: makeVoice(),
    musicPlan: makeMusic(),
    platformPlans: [makePlatformPlan(1), makePlatformPlan(2)],
    estimatedProductionDays: 4,
    productionOrder: ['thumbnail', 'script', 'voice', 'video'],
    ...overrides,
  });
}

describe('ProductionPlan', () => {
  it('creates with valid props', () => {
    const p = makePlan();
    expect(p.estimatedProductionDays).toBe(4);
    expect(p.targetPlatformCount()).toBe(2);
  });

  it('primaryPlatformPlan() returns plan with priority 1', () => {
    const p = makePlan();
    expect(p.primaryPlatformPlan()?.platform).toBe(Platform.YouTube);
  });

  it('primaryPlatformPlan() returns null when no priority-1 plan', () => {
    const p = makePlan({ platformPlans: [makePlatformPlan(2)] });
    expect(p.primaryPlatformPlan()).toBeNull();
  });

  it('targetPlatformCount() counts platforms', () => {
    expect(makePlan({ platformPlans: [] }).targetPlatformCount()).toBe(0);
  });

  it('platformPlans and productionOrder are frozen', () => {
    const p = makePlan();
    expect(Object.isFrozen(p.platformPlans)).toBe(true);
    expect(Object.isFrozen(p.productionOrder)).toBe(true);
  });
});
