import { ThumbnailPlan } from '../../../src/creative/domain/models/ThumbnailPlan';
import { ThumbnailStyle } from '../../../src/creative/domain/types';

function make(overrides = {}) {
  return ThumbnailPlan.create({
    style: ThumbnailStyle.HighContrast,
    textOverlay: 'Learn Python in 10 Minutes',
    colorScheme: ['#FF0000', '#FFFFFF'],
    composition: 'centered',
    imagePrompt: 'bold thumbnail with red background',
    moodKeywords: ['exciting', 'educational'],
    ...overrides,
  });
}

describe('ThumbnailPlan', () => {
  it('creates with valid props', () => {
    const t = make();
    expect(t.style).toBe(ThumbnailStyle.HighContrast);
    expect(t.textOverlay).toBe('Learn Python in 10 Minutes');
  });

  it('hasTextOverlay() returns true when text is present', () => {
    expect(make().hasTextOverlay()).toBe(true);
    expect(make({ textOverlay: '' }).hasTextOverlay()).toBe(false);
    expect(make({ textOverlay: '  ' }).hasTextOverlay()).toBe(false);
  });

  it('colorScheme and moodKeywords are frozen', () => {
    const t = make();
    expect(Object.isFrozen(t.colorScheme)).toBe(true);
    expect(Object.isFrozen(t.moodKeywords)).toBe(true);
  });
});
