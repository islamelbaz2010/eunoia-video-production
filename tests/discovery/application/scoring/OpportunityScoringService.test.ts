import { OpportunityScoringService } from '../../../../src/discovery/application/scoring/OpportunityScoringService';
import type { RawOpportunity, FetchParams } from '../../../../src/discovery/domain/providers/IDiscoveryProvider';

function makeRaw(overrides: Partial<RawOpportunity> = {}): RawOpportunity {
  return {
    title: 'How to build a YouTube channel in 2024',
    summary: 'A comprehensive guide to growing your YouTube presence.',
    url: 'https://example.com/article',
    publishedAt: new Date(),
    metadata: {},
    ...overrides,
  };
}

describe('OpportunityScoringService', () => {
  let service: OpportunityScoringService;

  beforeEach(() => {
    service = new OpportunityScoringService();
  });

  describe('score', () => {
    it('returns an OpportunityScore instance', () => {
      const score = service.score(makeRaw(), {});
      expect(score).toBeDefined();
      expect(score.total).toBeGreaterThanOrEqual(0);
      expect(score.total).toBeLessThanOrEqual(100);
    });

    describe('relevance', () => {
      it('scores 50 when no keywords are provided', () => {
        const score = service.score(makeRaw(), {});
        expect(score.relevance).toBe(50);
      });

      it('scores 100 when all keywords appear in title/summary', () => {
        const raw = makeRaw({ title: 'youtube channel growth', summary: 'tips for youtube' });
        const score = service.score(raw, { keywords: ['youtube', 'channel', 'growth'] });
        expect(score.relevance).toBe(100);
      });

      it('scores 0 when no keywords match', () => {
        const raw = makeRaw({ title: 'cooking pasta', summary: 'recipe for dinner' });
        const score = service.score(raw, { keywords: ['typescript', 'node'] });
        expect(score.relevance).toBe(0);
      });

      it('scores proportionally to keyword match rate', () => {
        const raw = makeRaw({ title: 'typescript tutorial', summary: 'learn typescript' });
        const score = service.score(raw, { keywords: ['typescript', 'javascript', 'python'] });
        // 1 out of 3 keywords matches (typescript)
        expect(score.relevance).toBe(33);
      });

      it('is case-insensitive', () => {
        const raw = makeRaw({ title: 'YOUTUBE GROWTH', summary: '' });
        const score = service.score(raw, { keywords: ['youtube', 'growth'] });
        expect(score.relevance).toBe(100);
      });
    });

    describe('engagement', () => {
      it('scores 0 when no engagement metadata is present', () => {
        const score = service.score(makeRaw({ metadata: {} }), {});
        expect(score.engagement).toBe(0);
      });

      it('increases with higher view counts', () => {
        const lowViews = service.score(makeRaw({ metadata: { views: 1_000 } }), {});
        const highViews = service.score(makeRaw({ metadata: { views: 100_000 } }), {});
        expect(highViews.engagement).toBeGreaterThan(lowViews.engagement);
      });

      it('incorporates likes, comments, and upvotes', () => {
        const withSignals = service.score(
          makeRaw({ metadata: { views: 0, likes: 500, comments: 100, upvotes: 200 } }),
          {},
        );
        const withoutSignals = service.score(makeRaw({ metadata: {} }), {});
        expect(withSignals.engagement).toBeGreaterThan(withoutSignals.engagement);
      });

      it('caps engagement at 100', () => {
        const score = service.score(
          makeRaw({ metadata: { views: 999_999_999, likes: 999_999_999 } }),
          {},
        );
        expect(score.engagement).toBeLessThanOrEqual(100);
      });
    });

    describe('timeliness', () => {
      it('scores 30 when publishedAt is null', () => {
        const score = service.score(makeRaw({ publishedAt: null }), {});
        expect(score.timeliness).toBe(30);
      });

      it('scores 100 for content published today', () => {
        const score = service.score(makeRaw({ publishedAt: new Date() }), {});
        expect(score.timeliness).toBe(100);
      });

      it('scores lower for older content', () => {
        const recent = service.score(makeRaw({ publishedAt: new Date() }), {});
        const old = service.score(
          makeRaw({ publishedAt: new Date(Date.now() - 60 * 86_400_000) }),
          {},
        );
        expect(old.timeliness).toBeLessThan(recent.timeliness);
      });

      it('timeliness is never negative', () => {
        const veryOld = new Date(Date.now() - 365 * 86_400_000);
        const score = service.score(makeRaw({ publishedAt: veryOld }), {});
        expect(score.timeliness).toBeGreaterThanOrEqual(0);
      });
    });

    describe('competition', () => {
      it('defaults to 50 when no competitionScore in metadata', () => {
        const score = service.score(makeRaw({ metadata: {} }), {});
        expect(score.competition).toBe(50);
      });

      it('uses the competitionScore from metadata when present', () => {
        const score = service.score(makeRaw({ metadata: { competitionScore: 30 } }), {});
        expect(score.competition).toBe(30);
      });
    });
  });
});
