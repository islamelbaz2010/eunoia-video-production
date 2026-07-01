import { ThumbnailCandidate } from '../../../src/media/domain/models/ThumbnailCandidate';

function makeCandidate(
  overrides: Partial<Parameters<typeof ThumbnailCandidate.create>[0]> = {},
): ThumbnailCandidate {
  return ThumbnailCandidate.create({
    videoAssetId: 'asset-1',
    timestampSeconds: 30,
    storageKey: 'channels/ch1/assets/a1/thumbnails/frame-30.jpg',
    visualQualityScore: 0.9,
    narrativeRelevanceScore: 0.8,
    aestheticConsistencyScore: 0.85,
    compositeScore: 0.87,
    isRecommended: true,
    ...overrides,
  });
}

describe('ThumbnailCandidate', () => {
  describe('create', () => {
    it('generates a frameId (uuid)', () => {
      const candidate = makeCandidate();
      expect(candidate.frameId).toBeDefined();
      expect(typeof candidate.frameId).toBe('string');
      expect(candidate.frameId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });

    it('generates unique frameIds for each candidate', () => {
      const c1 = makeCandidate();
      const c2 = makeCandidate();
      expect(c1.frameId).not.toBe(c2.frameId);
    });

    it('stores all provided scores', () => {
      const candidate = makeCandidate();
      expect(candidate.visualQualityScore).toBe(0.9);
      expect(candidate.narrativeRelevanceScore).toBe(0.8);
      expect(candidate.aestheticConsistencyScore).toBe(0.85);
      expect(candidate.compositeScore).toBe(0.87);
    });

    it('stores isRecommended flag', () => {
      const recommended = makeCandidate({ isRecommended: true });
      const notRecommended = makeCandidate({ isRecommended: false });
      expect(recommended.isRecommended).toBe(true);
      expect(notRecommended.isRecommended).toBe(false);
    });
  });

  describe('reconstitute', () => {
    it('restores exact frameId', () => {
      const candidate = ThumbnailCandidate.reconstitute({
        frameId: 'frame-id-123',
        videoAssetId: 'asset-1',
        timestampSeconds: 60,
        storageKey: 'key',
        visualQualityScore: 0.7,
        narrativeRelevanceScore: 0.7,
        aestheticConsistencyScore: 0.7,
        compositeScore: 0.7,
        isRecommended: false,
      });
      expect(candidate.frameId).toBe('frame-id-123');
    });
  });
});
