import { RevenuePrediction } from '../../../src/revenue/domain/models/RevenuePrediction';

function makeProps(overrides = {}) {
  return {
    estimatedRevenue: 10000,
    estimatedProfit: 7000,
    estimatedROI: 233.33,
    estimatedCAC: 50,
    estimatedLTV: 200,
    breakEvenPoint: 30,
    paybackPeriodDays: 45,
    confidenceLevel: 80,
    ...overrides,
  };
}

describe('RevenuePrediction', () => {
  it('creates with valid props', () => {
    const p = RevenuePrediction.create(makeProps());
    expect(p.estimatedRevenue).toBe(10000);
    expect(p.estimatedProfit).toBe(7000);
    expect(p.confidenceLevel).toBe(80);
  });

  it('clamps confidence to 0-100', () => {
    expect(RevenuePrediction.create(makeProps({ confidenceLevel: 150 })).confidenceLevel).toBe(100);
    expect(RevenuePrediction.create(makeProps({ confidenceLevel: -10 })).confidenceLevel).toBe(0);
  });

  it('isProfitable returns true when profit > 0', () => {
    expect(RevenuePrediction.create(makeProps({ estimatedProfit: 1 })).isProfitable()).toBe(true);
    expect(RevenuePrediction.create(makeProps({ estimatedProfit: 0 })).isProfitable()).toBe(false);
    expect(RevenuePrediction.create(makeProps({ estimatedProfit: -100 })).isProfitable()).toBe(false);
  });

  it('isHighROI defaults to 100% threshold', () => {
    expect(RevenuePrediction.create(makeProps({ estimatedROI: 100 })).isHighROI()).toBe(true);
    expect(RevenuePrediction.create(makeProps({ estimatedROI: 99 })).isHighROI()).toBe(false);
  });

  it('isHighROI uses custom threshold', () => {
    expect(RevenuePrediction.create(makeProps({ estimatedROI: 50 })).isHighROI(50)).toBe(true);
    expect(RevenuePrediction.create(makeProps({ estimatedROI: 50 })).isHighROI(51)).toBe(false);
  });
});
