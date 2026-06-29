import { RevenueModel } from '../../../src/revenue/domain/models/RevenueModel';
import { AppError } from '../../../src/shared/errors/AppError';

function makeProps(overrides = {}) {
  return {
    expectedViews: 100000,
    expectedClickRate: 0.05,
    expectedConversionRate: 0.02,
    averageOrderValue: 99,
    recurringRevenueRate: 0.3,
    affiliateCommissionRate: 0.1,
    sponsorshipRevenue: 500,
    ...overrides,
  };
}

describe('RevenueModel', () => {
  it('creates with valid props', () => {
    const m = RevenueModel.create(makeProps());
    expect(m.expectedViews).toBe(100000);
    expect(m.expectedClickRate).toBe(0.05);
    expect(m.expectedConversionRate).toBe(0.02);
  });

  it('static zero() returns all zeroes', () => {
    const m = RevenueModel.zero();
    expect(m.expectedViews).toBe(0);
    expect(m.averageOrderValue).toBe(0);
    expect(m.estimatedConversions()).toBe(0);
  });

  it('estimatedConversions = views * ctr * cvr', () => {
    const m = RevenueModel.create(makeProps());
    expect(m.estimatedConversions()).toBe(100000 * 0.05 * 0.02);
  });

  it('throws when expectedViews is negative', () => {
    expect(() => RevenueModel.create(makeProps({ expectedViews: -1 }))).toThrow(AppError);
  });

  it.each([
    ['expectedClickRate', 1.1],
    ['expectedClickRate', -0.1],
    ['expectedConversionRate', 1.5],
    ['expectedConversionRate', -0.1],
    ['affiliateCommissionRate', 1.5],
    ['affiliateCommissionRate', -0.1],
    ['recurringRevenueRate', 1.0],
    ['recurringRevenueRate', -0.5],
  ])('throws when %s = %s is out of range', (field, value) => {
    expect(() => RevenueModel.create(makeProps({ [field]: value }))).toThrow(AppError);
  });
});
