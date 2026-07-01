import { MusicPlan } from '../../../src/creative/domain/models/MusicPlan';
import { MusicMood } from '../../../src/creative/domain/types';
import { AppError } from '../../../src/shared/errors/AppError';

function make(overrides = {}) {
  return MusicPlan.create({
    mood: MusicMood.Upbeat,
    tempoBpm: 140,
    genre: 'pop',
    durationSeconds: 300,
    energyLevel: 85,
    ...overrides,
  });
}

describe('MusicPlan', () => {
  it('creates with valid props', () => {
    const m = make();
    expect(m.mood).toBe(MusicMood.Upbeat);
    expect(m.tempoBpm).toBe(140);
    expect(m.energyLevel).toBe(85);
  });

  it('throws when tempoBpm <= 0', () => {
    expect(() => make({ tempoBpm: 0 })).toThrow(AppError);
    expect(() => make({ tempoBpm: -1 })).toThrow(AppError);
  });

  it('throws when durationSeconds <= 0', () => {
    expect(() => make({ durationSeconds: 0 })).toThrow(AppError);
  });

  it('clamps energyLevel to 0-100', () => {
    expect(make({ energyLevel: 150 }).energyLevel).toBe(100);
    expect(make({ energyLevel: -10 }).energyLevel).toBe(0);
  });

  it('isHighEnergy() returns true when energyLevel >= 70', () => {
    expect(make({ energyLevel: 70 }).isHighEnergy()).toBe(true);
    expect(make({ energyLevel: 69 }).isHighEnergy()).toBe(false);
  });
});
