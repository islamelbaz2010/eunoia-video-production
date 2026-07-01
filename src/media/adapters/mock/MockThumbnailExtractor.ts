import { randomUUID } from 'crypto';
import { ThumbnailCandidate } from '../../domain/models/ThumbnailCandidate';
import type { IThumbnailExtractor, ThumbnailExtractionInput, ThumbnailExtractionResult } from '../IThumbnailExtractor';

const TIMESTAMPS = [0, 30, 60, 90, 120];

export class MockThumbnailExtractor implements IThumbnailExtractor {
  async extract(input: ThumbnailExtractionInput): Promise<ThumbnailExtractionResult> {
    const selectionId = randomUUID();
    const recommendedFrameId = randomUUID();

    const candidates = TIMESTAMPS.map((timestampSeconds, i) => {
      const compositeScore = 1.0 - i * 0.1;
      const frameId = i === 0 ? recommendedFrameId : randomUUID();
      return ThumbnailCandidate.reconstitute({
        frameId,
        videoAssetId: input.assetId,
        timestampSeconds,
        storageKey: `${input.storageKeyPrefix}/frame-${timestampSeconds}.jpg`,
        visualQualityScore: compositeScore,
        narrativeRelevanceScore: compositeScore,
        aestheticConsistencyScore: compositeScore,
        compositeScore,
        isRecommended: i === 0,
      });
    });

    return {
      selectionId,
      videoAssetId: input.assetId,
      candidates,
      recommendedFrameId,
    };
  }
}
