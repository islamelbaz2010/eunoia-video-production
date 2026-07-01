import { PlatformPlan } from '../../../src/creative/domain/models/PlatformPlan';
import { Platform, ContentType, VideoLength } from '../../../src/creative/domain/types';
import { AppError } from '../../../src/shared/errors/AppError';

function make(overrides = {}) {
  return PlatformPlan.create({
    platform: Platform.YouTube,
    contentType: ContentType.LongFormVideo,
    videoLength: VideoLength.Medium10m,
    publishingPriority: 1,
    adaptations: [],
    ...overrides,
  });
}

describe('PlatformPlan', () => {
  it('creates with valid props', () => {
    const p = make();
    expect(p.platform).toBe(Platform.YouTube);
    expect(p.publishingPriority).toBe(1);
  });

  it('throws when publishingPriority < 1', () => {
    expect(() => make({ publishingPriority: 0 })).toThrow(AppError);
    expect(() => make({ publishingPriority: -1 })).toThrow(AppError);
  });

  it('isPrimary() returns true when priority is 1', () => {
    expect(make({ publishingPriority: 1 }).isPrimary()).toBe(true);
    expect(make({ publishingPriority: 2 }).isPrimary()).toBe(false);
  });

  it('adaptations is frozen', () => {
    const p = make({ adaptations: ['Shorter format'] });
    expect(Object.isFrozen(p.adaptations)).toBe(true);
  });
});
