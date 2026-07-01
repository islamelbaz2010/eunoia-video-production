import { randomUUID } from 'crypto';
import type { IAIMetadataExtractor, MetadataExtractionInput, MetadataExtractionResult } from '../IAIMetadataExtractor';

export class MockAIMetadataExtractor implements IAIMetadataExtractor {
  async extract(input: MetadataExtractionInput): Promise<MetadataExtractionResult> {
    const scores = [0.9, 0.8, 0.7, 0.6, 0.5];

    const titleCandidates = scores.map((score, i) => ({
      text: `AI Title Candidate ${i + 1} for ${input.filename}`,
      score,
      rationale: `Candidate ${i + 1} rationale based on content analysis.`,
    }));

    const tags = Array.from({ length: 15 }, (_, i) => `tag-${i + 1}`);

    const chapters = [
      { timestampSeconds: 0, title: 'Introduction' },
      { timestampSeconds: 60, title: 'Main Content' },
      { timestampSeconds: 120, title: 'Conclusion' },
    ];

    return {
      extractionId: randomUUID(),
      videoAssetId: input.assetId,
      generatedAt: new Date(),
      titleCandidates,
      descriptionDraft: `AI-generated description for ${input.filename}`,
      tags,
      chapters,
      modelVersion: 'mock-v1',
      confidence: 'high',
    };
  }
}
