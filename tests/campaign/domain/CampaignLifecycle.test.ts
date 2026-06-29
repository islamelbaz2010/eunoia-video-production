import { CampaignLifecycle } from '../../../src/campaign/domain/models/CampaignLifecycle';

describe('CampaignLifecycle', () => {
  describe('empty', () => {
    it('creates lifecycle with all null timestamps', () => {
      const lc = CampaignLifecycle.empty();
      expect(lc.approvedAt).toBeNull();
      expect(lc.startedAt).toBeNull();
      expect(lc.pausedAt).toBeNull();
      expect(lc.completedAt).toBeNull();
      expect(lc.cancelledAt).toBeNull();
      expect(lc.archivedAt).toBeNull();
    });
  });

  describe('create', () => {
    it('stores provided timestamps as defensive copies', () => {
      const approvedAt = new Date('2025-01-01T00:00:00Z');
      const lc = CampaignLifecycle.create({
        approvedAt,
        startedAt: null,
        pausedAt: null,
        completedAt: null,
        cancelledAt: null,
        archivedAt: null,
      });
      approvedAt.setFullYear(2030);
      expect(lc.approvedAt?.getFullYear()).toBe(2025);
    });
  });

  describe('isApproved', () => {
    it('returns false when approvedAt is null', () => {
      expect(CampaignLifecycle.empty().isApproved()).toBe(false);
    });

    it('returns true when approvedAt is set', () => {
      const lc = CampaignLifecycle.empty().withApprovedAt(new Date());
      expect(lc.isApproved()).toBe(true);
    });
  });

  describe('with* methods', () => {
    it('withApprovedAt sets approvedAt and preserves other fields', () => {
      const lc = CampaignLifecycle.empty().withApprovedAt(new Date('2025-02-01T00:00:00Z'));
      expect(lc.approvedAt).toEqual(new Date('2025-02-01T00:00:00Z'));
      expect(lc.startedAt).toBeNull();
    });

    it('withStartedAt sets startedAt', () => {
      const now = new Date();
      const lc = CampaignLifecycle.empty().withStartedAt(now);
      expect(lc.startedAt).toEqual(now);
    });

    it('withPausedAt sets pausedAt', () => {
      const now = new Date();
      const lc = CampaignLifecycle.empty().withPausedAt(now);
      expect(lc.pausedAt).toEqual(now);
    });

    it('withCompletedAt sets completedAt', () => {
      const now = new Date();
      const lc = CampaignLifecycle.empty().withCompletedAt(now);
      expect(lc.completedAt).toEqual(now);
    });

    it('withCancelledAt sets cancelledAt', () => {
      const now = new Date();
      const lc = CampaignLifecycle.empty().withCancelledAt(now);
      expect(lc.cancelledAt).toEqual(now);
    });

    it('withArchivedAt sets archivedAt', () => {
      const now = new Date();
      const lc = CampaignLifecycle.empty().withArchivedAt(now);
      expect(lc.archivedAt).toEqual(now);
    });

    it('chaining with* methods accumulates timestamps', () => {
      const approvedAt = new Date('2025-01-10T00:00:00Z');
      const startedAt = new Date('2025-01-15T00:00:00Z');
      const lc = CampaignLifecycle.empty()
        .withApprovedAt(approvedAt)
        .withStartedAt(startedAt);

      expect(lc.approvedAt).toEqual(approvedAt);
      expect(lc.startedAt).toEqual(startedAt);
      expect(lc.pausedAt).toBeNull();
    });

    it('each with* call returns a new instance', () => {
      const original = CampaignLifecycle.empty();
      const updated = original.withApprovedAt(new Date());
      expect(updated).not.toBe(original);
    });
  });
});
