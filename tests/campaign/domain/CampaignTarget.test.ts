import { CampaignTarget } from '../../../src/campaign/domain/models/CampaignTarget';

describe('CampaignTarget', () => {
  function makeTarget(overrides: Partial<Parameters<typeof CampaignTarget.create>[0]> = {}) {
    return CampaignTarget.create({
      expectedRevenue: 100000,
      expectedROI: 200,
      expectedViews: 500000,
      expectedLeads: 1000,
      expectedSubscribers: 5000,
      deadline: new Date('2025-12-31T00:00:00Z'),
      ...overrides,
    });
  }

  describe('create', () => {
    it('stores all provided fields', () => {
      const deadline = new Date('2025-06-30T00:00:00Z');
      const target = makeTarget({ deadline });

      expect(target.expectedRevenue).toBe(100000);
      expect(target.expectedROI).toBe(200);
      expect(target.expectedViews).toBe(500000);
      expect(target.expectedLeads).toBe(1000);
      expect(target.expectedSubscribers).toBe(5000);
      expect(target.deadline).toEqual(deadline);
    });

    it('creates a defensive copy of deadline', () => {
      const deadline = new Date('2025-06-30T00:00:00Z');
      const target = makeTarget({ deadline });
      deadline.setFullYear(2030);
      expect(target.deadline.getFullYear()).toBe(2025);
    });
  });

  describe('isPastDeadline', () => {
    it('returns true for a past deadline', () => {
      const target = makeTarget({ deadline: new Date('2000-01-01T00:00:00Z') });
      expect(target.isPastDeadline()).toBe(true);
    });

    it('returns false for a future deadline', () => {
      const target = makeTarget({ deadline: new Date('2099-01-01T00:00:00Z') });
      expect(target.isPastDeadline()).toBe(false);
    });
  });
});
