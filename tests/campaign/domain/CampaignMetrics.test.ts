import { CampaignMetrics } from '../../../src/campaign/domain/models/CampaignMetrics';

describe('CampaignMetrics', () => {
  describe('create', () => {
    it('stores provided base fields', () => {
      const metrics = CampaignMetrics.create({
        revenue: 50000,
        cost: 10000,
        views: 200000,
        clicks: 4000,
        conversionRate: 2,
        subscribers: 500,
        leads: 200,
        ltv: 250,
      });

      expect(metrics.revenue).toBe(50000);
      expect(metrics.cost).toBe(10000);
      expect(metrics.views).toBe(200000);
      expect(metrics.clicks).toBe(4000);
      expect(metrics.conversionRate).toBe(2);
      expect(metrics.subscribers).toBe(500);
      expect(metrics.leads).toBe(200);
      expect(metrics.ltv).toBe(250);
    });

    it('computes roi as (revenue - cost) / cost * 100', () => {
      const metrics = CampaignMetrics.create({
        revenue: 15000,
        cost: 10000,
        views: 0,
        clicks: 0,
        conversionRate: 0,
        subscribers: 0,
        leads: 0,
        ltv: 0,
      });
      expect(metrics.roi).toBeCloseTo(50);
    });

    it('returns roi of 0 when cost is zero', () => {
      const metrics = CampaignMetrics.create({
        revenue: 5000,
        cost: 0,
        views: 0,
        clicks: 0,
        conversionRate: 0,
        subscribers: 0,
        leads: 0,
        ltv: 0,
      });
      expect(metrics.roi).toBe(0);
    });

    it('computes ctr as clicks / views * 100', () => {
      const metrics = CampaignMetrics.create({
        revenue: 0,
        cost: 0,
        views: 1000,
        clicks: 50,
        conversionRate: 0,
        subscribers: 0,
        leads: 0,
        ltv: 0,
      });
      expect(metrics.ctr).toBeCloseTo(5);
    });

    it('returns ctr of 0 when views is zero', () => {
      const metrics = CampaignMetrics.create({
        revenue: 0,
        cost: 0,
        views: 0,
        clicks: 10,
        conversionRate: 0,
        subscribers: 0,
        leads: 0,
        ltv: 0,
      });
      expect(metrics.ctr).toBe(0);
    });

    it('computes cpl as cost / leads', () => {
      const metrics = CampaignMetrics.create({
        revenue: 0,
        cost: 10000,
        views: 0,
        clicks: 0,
        conversionRate: 0,
        subscribers: 0,
        leads: 200,
        ltv: 0,
      });
      expect(metrics.cpl).toBeCloseTo(50);
    });

    it('returns cpl of 0 when leads is zero', () => {
      const metrics = CampaignMetrics.create({
        revenue: 0,
        cost: 10000,
        views: 0,
        clicks: 0,
        conversionRate: 0,
        subscribers: 0,
        leads: 0,
        ltv: 0,
      });
      expect(metrics.cpl).toBe(0);
    });

    it('computes cac as cost / (views * conversionRate / 100)', () => {
      const metrics = CampaignMetrics.create({
        revenue: 0,
        cost: 10000,
        views: 1000,
        clicks: 0,
        conversionRate: 2,
        subscribers: 0,
        leads: 0,
        ltv: 0,
      });
      expect(metrics.cac).toBeCloseTo(500);
    });

    it('returns cac of 0 when views or conversionRate is zero', () => {
      const m1 = CampaignMetrics.create({
        revenue: 0,
        cost: 10000,
        views: 0,
        clicks: 0,
        conversionRate: 2,
        subscribers: 0,
        leads: 0,
        ltv: 0,
      });
      const m2 = CampaignMetrics.create({
        revenue: 0,
        cost: 10000,
        views: 1000,
        clicks: 0,
        conversionRate: 0,
        subscribers: 0,
        leads: 0,
        ltv: 0,
      });
      expect(m1.cac).toBe(0);
      expect(m2.cac).toBe(0);
    });
  });

  describe('empty', () => {
    it('creates zero-valued metrics', () => {
      const metrics = CampaignMetrics.empty();
      expect(metrics.revenue).toBe(0);
      expect(metrics.cost).toBe(0);
      expect(metrics.roi).toBe(0);
      expect(metrics.views).toBe(0);
      expect(metrics.clicks).toBe(0);
      expect(metrics.ctr).toBe(0);
      expect(metrics.conversionRate).toBe(0);
      expect(metrics.subscribers).toBe(0);
      expect(metrics.leads).toBe(0);
      expect(metrics.cpl).toBe(0);
      expect(metrics.cac).toBe(0);
      expect(metrics.ltv).toBe(0);
    });
  });
});
