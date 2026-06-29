import { Opportunity, OpportunityStatus } from '../../../src/discovery/domain/models/Opportunity';
import { OpportunityScore } from '../../../src/discovery/domain/models/OpportunityScore';
import { DiscoverySource } from '../../../src/discovery/domain/providers/IDiscoveryProvider';

function makeScore(): OpportunityScore {
  return OpportunityScore.create({ relevance: 80, engagement: 60, timeliness: 70, competition: 30 });
}

function makeOpportunity(overrides: Partial<Parameters<typeof Opportunity.create>[0]> = {}): Opportunity {
  return Opportunity.create({
    title: 'Test title',
    summary: 'Test summary',
    source: DiscoverySource.RSS,
    sourceUrl: 'https://example.com/article',
    score: makeScore(),
    keywords: ['typescript', 'testing'],
    metadata: { feedUrl: 'https://example.com/feed' },
    publishedAt: new Date('2024-06-01T00:00:00Z'),
    ...overrides,
  });
}

describe('Opportunity', () => {
  describe('create', () => {
    it('generates a unique uuid id', () => {
      const a = makeOpportunity();
      const b = makeOpportunity();
      expect(a.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(a.id).not.toBe(b.id);
    });

    it('sets status to NEW by default', () => {
      const opp = makeOpportunity();
      expect(opp.status).toBe(OpportunityStatus.NEW);
    });

    it('sets discoveredAt to approximately now', () => {
      const before = new Date();
      const opp = makeOpportunity();
      const after = new Date();
      expect(opp.discoveredAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(opp.discoveredAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('stores all provided fields', () => {
      const publishedAt = new Date('2024-05-15T12:00:00Z');
      const opp = makeOpportunity({ publishedAt });

      expect(opp.title).toBe('Test title');
      expect(opp.summary).toBe('Test summary');
      expect(opp.source).toBe(DiscoverySource.RSS);
      expect(opp.sourceUrl).toBe('https://example.com/article');
      expect(opp.keywords).toEqual(['typescript', 'testing']);
      expect(opp.publishedAt).toEqual(publishedAt);
    });

    it('accepts null publishedAt', () => {
      const opp = makeOpportunity({ publishedAt: null });
      expect(opp.publishedAt).toBeNull();
    });

    it('freezes keywords so the array cannot be mutated externally', () => {
      const keywords = ['a', 'b'];
      const opp = makeOpportunity({ keywords });
      expect(() => {
        (opp.keywords as string[]).push('c');
      }).toThrow();
    });
  });

  describe('withStatus', () => {
    it('returns a new Opportunity with the updated status', () => {
      const original = makeOpportunity();
      const accepted = original.withStatus(OpportunityStatus.ACCEPTED);

      expect(accepted.status).toBe(OpportunityStatus.ACCEPTED);
      expect(original.status).toBe(OpportunityStatus.NEW);
    });

    it('preserves all other fields', () => {
      const original = makeOpportunity();
      const updated = original.withStatus(OpportunityStatus.REJECTED);

      expect(updated.id).toBe(original.id);
      expect(updated.title).toBe(original.title);
      expect(updated.source).toBe(original.source);
      expect(updated.score).toBe(original.score);
    });

    it('returns a different object reference', () => {
      const original = makeOpportunity();
      const updated = original.withStatus(OpportunityStatus.REVIEWED);
      expect(updated).not.toBe(original);
    });
  });

  describe('isHighValue', () => {
    it('returns true when total score is at or above the threshold', () => {
      const score = OpportunityScore.create({ relevance: 100, engagement: 100, timeliness: 100, competition: 0 });
      const opp = makeOpportunity({ score });
      expect(opp.isHighValue(70)).toBe(true);
    });

    it('returns false when total score is below the threshold', () => {
      const score = OpportunityScore.create({ relevance: 0, engagement: 0, timeliness: 0, competition: 100 });
      const opp = makeOpportunity({ score });
      expect(opp.isHighValue(70)).toBe(false);
    });

    it('uses 70 as the default threshold', () => {
      const score = OpportunityScore.create({ relevance: 100, engagement: 100, timeliness: 100, competition: 0 });
      const opp = makeOpportunity({ score });
      expect(opp.isHighValue()).toBe(true);
    });
  });

  describe('reconstitute', () => {
    it('restores an opportunity with exact props', () => {
      const original = makeOpportunity();
      const restored = Opportunity.reconstitute({
        id: original.id,
        title: original.title,
        summary: original.summary,
        source: original.source,
        sourceUrl: original.sourceUrl,
        score: original.score,
        keywords: [...original.keywords],
        metadata: { ...original.metadata },
        status: original.status,
        publishedAt: original.publishedAt,
        discoveredAt: original.discoveredAt,
      });

      expect(restored.id).toBe(original.id);
      expect(restored.status).toBe(original.status);
    });
  });
});
