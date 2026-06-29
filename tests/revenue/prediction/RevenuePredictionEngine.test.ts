import { RevenuePredictionEngine } from '../../../src/revenue/prediction/RevenuePredictionEngine';
import { RevenueModel } from '../../../src/revenue/domain/models/RevenueModel';
import { CostModel } from '../../../src/revenue/domain/models/CostModel';

const engine = new RevenuePredictionEngine();

function makeModel(overrides = {}) {
  return RevenueModel.create({
    expectedViews: 100000,
    expectedClickRate: 0.05,
    expectedConversionRate: 0.02,
    averageOrderValue: 100,
    recurringRevenueRate: 0,
    affiliateCommissionRate: 0,
    sponsorshipRevenue: 0,
    ...overrides,
  });
}

function makeCost(advertising = 500) {
  return CostModel.create({
    aiGenerationCost: 100,
    voiceGenerationCost: 50,
    imageGenerationCost: 30,
    videoGenerationCost: 200,
    editingCost: 80,
    publishingCost: 20,
    advertisingCost: advertising,
    humanReviewCost: 60,
    infrastructureCost: 40,
  });
}

describe('RevenuePredictionEngine', () => {
  it('estimates revenue from views * ctr * cvr * aov', () => {
    const model = makeModel();
    const cost = makeCost(0);
    const prediction = engine.predict(model, cost);
    // 100000 * 0.05 * 0.02 * 100 = 10000
    expect(prediction.estimatedRevenue).toBe(10000);
  });

  it('adds sponsorship revenue', () => {
    const model = makeModel({ sponsorshipRevenue: 500 });
    const cost = makeCost(0);
    const prediction = engine.predict(model, cost);
    expect(prediction.estimatedRevenue).toBe(10500);
  });

  it('adds affiliate revenue', () => {
    const model = makeModel({ affiliateCommissionRate: 0.1 });
    const cost = makeCost(0);
    const prediction = engine.predict(model, cost);
    // base = 10000; affiliate = 10000 * 0.1 = 1000; total = 11000
    expect(prediction.estimatedRevenue).toBe(11000);
  });

  it('estimatedProfit = revenue - cost', () => {
    const model = makeModel();
    const cost = makeCost(500);
    const prediction = engine.predict(model, cost);
    expect(prediction.estimatedProfit).toBe(Math.round((prediction.estimatedRevenue - cost.total) * 100) / 100);
  });

  it('estimatedROI = profit/cost * 100', () => {
    const model = makeModel();
    const cost = makeCost();
    const prediction = engine.predict(model, cost);
    const expectedROI = Math.round(((prediction.estimatedProfit / cost.total) * 100) * 100) / 100;
    expect(prediction.estimatedROI).toBe(expectedROI);
  });

  it('estimatedCAC = cost / conversions', () => {
    const model = makeModel();
    const cost = makeCost();
    const prediction = engine.predict(model, cost);
    const conversions = model.estimatedConversions();
    expect(prediction.estimatedCAC).toBe(Math.round((cost.total / conversions) * 100) / 100);
  });

  it('returns LTV = aov when recurringRevenueRate is 0', () => {
    const model = makeModel({ recurringRevenueRate: 0 });
    const cost = makeCost();
    const prediction = engine.predict(model, cost);
    expect(prediction.estimatedLTV).toBe(model.averageOrderValue);
  });

  it('returns LTV > aov when recurringRevenueRate > 0', () => {
    const model = makeModel({ recurringRevenueRate: 0.5 });
    const cost = makeCost();
    const prediction = engine.predict(model, cost);
    expect(prediction.estimatedLTV).toBeGreaterThan(model.averageOrderValue);
  });

  it('confidenceLevel = 100 when all model fields filled', () => {
    const model = makeModel({ sponsorshipRevenue: 100 });
    const cost = makeCost();
    const prediction = engine.predict(model, cost);
    expect(prediction.confidenceLevel).toBe(100);
  });

  it('confidenceLevel = 0 for zero model', () => {
    const model = RevenueModel.zero();
    const cost = CostModel.zero();
    const prediction = engine.predict(model, cost);
    expect(prediction.confidenceLevel).toBe(0);
  });
});
