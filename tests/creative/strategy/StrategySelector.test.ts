import { StrategySelector } from '../../../src/creative/strategy/StrategySelector';
import {
  CreativeGoal,
  Platform,
  CreativeStrategyType,
  ContentType,
  VideoLength,
  VoiceStyle,
  MusicMood,
  HookStrategy,
  StoryStructure,
  CTAStrategy,
  VisualStyle,
  ThumbnailStyle,
} from '../../../src/creative/domain/types';
import { CampaignType } from '../../../src/campaign/domain/models/Campaign';

const selector = new StrategySelector();

describe('StrategySelector.selectStrategy()', () => {
  it('returns Tutorial strategy for SaaS goal on YouTube', () => {
    const strategy = selector.selectStrategy(CreativeGoal.SaaSConversion, Platform.YouTube, CampaignType.Content);
    expect(strategy.strategyType).toBe(CreativeStrategyType.Tutorial);
  });

  it('returns Educational strategy for Education goal on YouTube', () => {
    const strategy = selector.selectStrategy(CreativeGoal.Education, Platform.YouTube, CampaignType.Content);
    expect(strategy.strategyType).toBe(CreativeStrategyType.Educational);
  });

  it('returns ViralShort strategy for Entertainment on TikTok', () => {
    const strategy = selector.selectStrategy(CreativeGoal.Entertainment, Platform.TikTok, CampaignType.Content);
    expect(strategy.strategyType).toBe(CreativeStrategyType.ViralShort);
  });

  it('returns Tutorial strategy for SaaS on TikTok', () => {
    const strategy = selector.selectStrategy(CreativeGoal.SaaSConversion, Platform.TikTok, CampaignType.Content);
    expect(strategy.strategyType).toBe(CreativeStrategyType.Tutorial);
  });

  it('returns Tutorial strategy for Education on Instagram', () => {
    const strategy = selector.selectStrategy(CreativeGoal.Education, Platform.Instagram, CampaignType.Content);
    expect(strategy.strategyType).toBe(CreativeStrategyType.Tutorial);
  });

  it('returns Documentary strategy for BrandAwareness on LinkedIn', () => {
    const strategy = selector.selectStrategy(CreativeGoal.BrandAwareness, Platform.LinkedIn, CampaignType.Content);
    expect(strategy.strategyType).toBe(CreativeStrategyType.Documentary);
  });

  it('returns Educational strategy for LinkedIn professional platform', () => {
    const strategy = selector.selectStrategy(CreativeGoal.Education, Platform.LinkedIn, CampaignType.Content);
    expect(strategy.strategyType).toBe(CreativeStrategyType.Educational);
  });

  it('returns News strategy for X platform', () => {
    const strategy = selector.selectStrategy(CreativeGoal.BrandAwareness, Platform.X, CampaignType.Content);
    expect(strategy.strategyType).toBe(CreativeStrategyType.News);
  });

  it('returns Documentary for BrandAwareness on YouTube', () => {
    const strategy = selector.selectStrategy(CreativeGoal.BrandAwareness, Platform.YouTube, CampaignType.Content);
    expect(strategy.strategyType).toBe(CreativeStrategyType.Documentary);
  });

  it('returns ProductReview for LeadGeneration', () => {
    const strategy = selector.selectStrategy(CreativeGoal.LeadGeneration, Platform.YouTube, CampaignType.Content);
    expect(strategy.strategyType).toBe(CreativeStrategyType.ProductReview);
  });

  it('returns Comparison for AffiliateSales', () => {
    const strategy = selector.selectStrategy(CreativeGoal.AffiliateSales, Platform.YouTube, CampaignType.Content);
    expect(strategy.strategyType).toBe(CreativeStrategyType.Comparison);
  });

  it('returns Storytelling for ProductLaunch', () => {
    const strategy = selector.selectStrategy(CreativeGoal.ProductLaunch, Platform.YouTube, CampaignType.Content);
    expect(strategy.strategyType).toBe(CreativeStrategyType.Storytelling);
  });

  it('returns Listicle for CommunityGrowth', () => {
    const strategy = selector.selectStrategy(CreativeGoal.CommunityGrowth, Platform.YouTube, CampaignType.Content);
    expect(strategy.strategyType).toBe(CreativeStrategyType.Listicle);
  });

  it('uses Energetic voice for short-form platforms', () => {
    const strategy = selector.selectStrategy(CreativeGoal.Education, Platform.TikTok, CampaignType.Content);
    expect(strategy.voiceStyle).toBe(VoiceStyle.Energetic);
  });

  it('uses Professional voice for LinkedIn', () => {
    const strategy = selector.selectStrategy(CreativeGoal.Education, Platform.LinkedIn, CampaignType.Content);
    expect(strategy.voiceStyle).toBe(VoiceStyle.Professional);
  });

  it('uses Narrator voice for Documentary strategy', () => {
    const strategy = selector.selectStrategy(CreativeGoal.BrandAwareness, Platform.YouTube, CampaignType.Content);
    expect(strategy.voiceStyle).toBe(VoiceStyle.Narrator);
  });

  it('uses Storyteller voice for Storytelling strategy', () => {
    const strategy = selector.selectStrategy(CreativeGoal.ProductLaunch, Platform.YouTube, CampaignType.Content);
    expect(strategy.voiceStyle).toBe(VoiceStyle.Storyteller);
  });

  it('uses Conversational voice for Tutorial strategy', () => {
    const strategy = selector.selectStrategy(CreativeGoal.SaaSConversion, Platform.YouTube, CampaignType.Content);
    expect(strategy.voiceStyle).toBe(VoiceStyle.Conversational);
  });

  it('sets all required hook, structure, cta, visual, music fields', () => {
    const strategy = selector.selectStrategy(CreativeGoal.Education, Platform.YouTube, CampaignType.Content);
    expect(Object.values(HookStrategy)).toContain(strategy.hookStrategy);
    expect(Object.values(StoryStructure)).toContain(strategy.storyStructure);
    expect(Object.values(CTAStrategy)).toContain(strategy.ctaStrategy);
    expect(Object.values(VisualStyle)).toContain(strategy.visualStyle);
    expect(Object.values(MusicMood)).toContain(strategy.musicMood);
  });

  it('includes default AI providers', () => {
    const strategy = selector.selectStrategy(CreativeGoal.Education, Platform.YouTube, CampaignType.Content);
    expect(strategy.providerFor('script')).not.toBeNull();
    expect(strategy.providerFor('image')).not.toBeNull();
  });
});

describe('StrategySelector.resolveContentTypeAndLength()', () => {
  it('returns Reel and Short15s for Entertainment on TikTok', () => {
    const d = selector.resolveContentTypeAndLength(CreativeGoal.Entertainment, Platform.TikTok);
    expect(d.contentType).toBe(ContentType.Reel);
    expect(d.videoLength).toBe(VideoLength.Short15s);
  });

  it('returns Reel and Short60s for non-Entertainment on TikTok', () => {
    const d = selector.resolveContentTypeAndLength(CreativeGoal.Education, Platform.TikTok);
    expect(d.contentType).toBe(ContentType.Reel);
    expect(d.videoLength).toBe(VideoLength.Short60s);
  });

  it('returns LongFormVideo and Medium5m for LinkedIn', () => {
    const d = selector.resolveContentTypeAndLength(CreativeGoal.Education, Platform.LinkedIn);
    expect(d.contentType).toBe(ContentType.LongFormVideo);
    expect(d.videoLength).toBe(VideoLength.Medium5m);
  });

  it('returns LongFormVideo for YouTube Education (10m)', () => {
    const d = selector.resolveContentTypeAndLength(CreativeGoal.Education, Platform.YouTube);
    expect(d.contentType).toBe(ContentType.LongFormVideo);
    expect(d.videoLength).toBe(VideoLength.Medium10m);
  });

  it('returns LongFormVideo for YouTube Entertainment (5m)', () => {
    const d = selector.resolveContentTypeAndLength(CreativeGoal.Entertainment, Platform.YouTube);
    expect(d.videoLength).toBe(VideoLength.Medium5m);
  });

  it('returns LongFormVideo for YouTube ProductLaunch (3m)', () => {
    const d = selector.resolveContentTypeAndLength(CreativeGoal.ProductLaunch, Platform.YouTube);
    expect(d.videoLength).toBe(VideoLength.Medium3m);
  });

  it('returns Course and Long15m for Whop', () => {
    const d = selector.resolveContentTypeAndLength(CreativeGoal.Education, Platform.Whop);
    expect(d.contentType).toBe(ContentType.Course);
    expect(d.videoLength).toBe(VideoLength.Long15m);
  });

  it('returns ShortFormVideo for Facebook/Website', () => {
    const d = selector.resolveContentTypeAndLength(CreativeGoal.AffiliateSales, Platform.Facebook);
    expect(d.contentType).toBe(ContentType.ShortFormVideo);
    expect(d.videoLength).toBe(VideoLength.Medium3m);
  });

  it('returns thumbnailStyle for each strategy', () => {
    const d = selector.resolveContentTypeAndLength(CreativeGoal.Education, Platform.YouTube);
    expect(Object.values(ThumbnailStyle)).toContain(d.thumbnailStyle);
  });

  it('handles YouTube SaaS as Medium10m', () => {
    const d = selector.resolveContentTypeAndLength(CreativeGoal.SaaSConversion, Platform.YouTube);
    expect(d.videoLength).toBe(VideoLength.Medium10m);
  });

  it('handles Website platform as ShortFormVideo', () => {
    const d = selector.resolveContentTypeAndLength(CreativeGoal.BrandAwareness, Platform.Website);
    expect(d.contentType).toBe(ContentType.ShortFormVideo);
  });
});
