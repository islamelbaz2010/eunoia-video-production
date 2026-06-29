import { CostModel, CostCategory } from '../../../src/revenue/domain/models/CostModel';
import { AppError } from '../../../src/shared/errors/AppError';

function makeProps(overrides = {}) {
  return {
    aiGenerationCost: 100,
    voiceGenerationCost: 50,
    imageGenerationCost: 30,
    videoGenerationCost: 200,
    editingCost: 80,
    publishingCost: 20,
    advertisingCost: 500,
    humanReviewCost: 60,
    infrastructureCost: 40,
    ...overrides,
  };
}

describe('CostModel', () => {
  it('creates with valid props and computes total', () => {
    const c = CostModel.create(makeProps());
    expect(c.total).toBe(100 + 50 + 30 + 200 + 80 + 20 + 500 + 60 + 40);
  });

  it('zero() returns all zeroes with total 0', () => {
    const c = CostModel.zero();
    expect(c.total).toBe(0);
    expect(c.aiGenerationCost).toBe(0);
  });

  it('throws on any negative cost', () => {
    expect(() => CostModel.create(makeProps({ aiGenerationCost: -1 }))).toThrow(AppError);
    expect(() => CostModel.create(makeProps({ advertisingCost: -0.01 }))).toThrow(AppError);
  });

  it('breakdown() returns all 9 categories', () => {
    const c = CostModel.create(makeProps());
    const bd = c.breakdown();
    expect(Object.keys(bd)).toHaveLength(9);
    expect(bd[CostCategory.AiGeneration]).toBe(100);
    expect(bd[CostCategory.Advertising]).toBe(500);
  });

  it('breakdown result is frozen', () => {
    const c = CostModel.create(makeProps());
    expect(Object.isFrozen(c.breakdown())).toBe(true);
  });
});
