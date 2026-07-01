import type { ThumbnailCandidate } from '../domain/models/ThumbnailCandidate';

export interface ThumbnailExtractionInput {
  readonly assetId: string;
  readonly durationSeconds: number;
  readonly storageKeyPrefix: string;
}

export interface ThumbnailExtractionResult {
  readonly selectionId: string;
  readonly videoAssetId: string;
  readonly candidates: ThumbnailCandidate[];
  readonly recommendedFrameId: string;
}

export interface IThumbnailExtractor {
  extract(input: ThumbnailExtractionInput): Promise<ThumbnailExtractionResult>;
}
