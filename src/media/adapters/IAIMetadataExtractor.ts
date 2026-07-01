import type { TitleCandidate } from '../domain/models/TitleCandidate';
import type { Chapter } from '../domain/models/Chapter';

export interface MetadataExtractionInput {
  readonly assetId: string;
  readonly filename: string;
  readonly durationSeconds: number;
  readonly workingTitle: string | null;
  readonly creatorNotes: string | null;
}

export interface MetadataExtractionResult {
  readonly extractionId: string;
  readonly videoAssetId: string;
  readonly generatedAt: Date;
  readonly titleCandidates: TitleCandidate[];
  readonly descriptionDraft: string;
  readonly tags: string[];
  readonly chapters: Chapter[];
  readonly modelVersion: string;
  readonly confidence: 'high' | 'medium' | 'low';
}

export interface IAIMetadataExtractor {
  extract(input: MetadataExtractionInput): Promise<MetadataExtractionResult>;
}
