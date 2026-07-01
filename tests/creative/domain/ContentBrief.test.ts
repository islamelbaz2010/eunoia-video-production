import { ContentBrief } from '../../../src/creative/domain/models/ContentBrief';
import { CreativeGoal, Platform } from '../../../src/creative/domain/types';
import { CampaignType } from '../../../src/campaign/domain/models/Campaign';
import { AppError } from '../../../src/shared/errors/AppError';

function make(overrides = {}) {
  return ContentBrief.create({
    topic: 'How to Build a SaaS',
    goal: CreativeGoal.SaaSConversion,
    primaryPlatform: Platform.YouTube,
    additionalPlatforms: [Platform.LinkedIn],
    targetAudience: 'developers and entrepreneurs',
    keyMessages: ['Build fast', 'Ship often', 'Iterate'],
    tone: 'professional',
    callToAction: 'Start your free trial',
    keywords: ['saas', 'startup', 'coding'],
    campaignType: CampaignType.Content,
    ...overrides,
  });
}

describe('ContentBrief', () => {
  it('creates with valid props', () => {
    const b = make();
    expect(b.topic).toBe('How to Build a SaaS');
    expect(b.goal).toBe(CreativeGoal.SaaSConversion);
    expect(b.primaryPlatform).toBe(Platform.YouTube);
  });

  it('throws on empty topic', () => {
    expect(() => make({ topic: '' })).toThrow(AppError);
    expect(() => make({ topic: '  ' })).toThrow(AppError);
  });

  it('throws on empty target audience', () => {
    expect(() => make({ targetAudience: '' })).toThrow(AppError);
  });

  it('limits keyMessages to 5', () => {
    const b = make({ keyMessages: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] });
    expect(b.keyMessages).toHaveLength(5);
  });

  it('allPlatforms() includes primary and additional', () => {
    const b = make();
    expect(b.allPlatforms()).toContain(Platform.YouTube);
    expect(b.allPlatforms()).toContain(Platform.LinkedIn);
  });

  it('isMultiPlatform() returns true when additionalPlatforms is non-empty', () => {
    expect(make().isMultiPlatform()).toBe(true);
    expect(make({ additionalPlatforms: [] }).isMultiPlatform()).toBe(false);
  });

  it('additionalPlatforms and keywords are frozen', () => {
    const b = make();
    expect(Object.isFrozen(b.additionalPlatforms)).toBe(true);
    expect(Object.isFrozen(b.keywords)).toBe(true);
  });
});
