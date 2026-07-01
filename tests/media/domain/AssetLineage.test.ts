import { AssetLineage } from '../../../src/media/domain/models/AssetLineage';
import { AssetSourceType } from '../../../src/media/domain/models/AssetSourceType';
import type { AssetTransformation } from '../../../src/media/domain/models/AssetTransformation';

function makeLineage(overrides: Partial<Parameters<typeof AssetLineage.create>[0]> = {}): AssetLineage {
  return AssetLineage.create({
    assetId: 'asset-1',
    sourceType: AssetSourceType.DirectUpload,
    sourceReference: '/uploads/video.mp4',
    ingestedAt: new Date('2025-01-01'),
    contentHash: 'abc123hash',
    ...overrides,
  });
}

function makeTransformation(): AssetTransformation {
  return {
    type: 'thumbnail_extraction',
    appliedAt: new Date(),
    systemVersion: '1.0.0',
    modelVersion: null,
  };
}

describe('AssetLineage', () => {
  describe('create', () => {
    it('sets empty transformations array', () => {
      const lineage = makeLineage();
      expect(lineage.transformations).toHaveLength(0);
    });

    it('stores all provided props', () => {
      const lineage = makeLineage();
      expect(lineage.assetId).toBe('asset-1');
      expect(lineage.contentHash).toBe('abc123hash');
      expect(lineage.sourceReference).toBe('/uploads/video.mp4');
    });
  });

  describe('withTransformation', () => {
    it('appends transformation, original unchanged', () => {
      const lineage = makeLineage();
      const t = makeTransformation();
      const updated = lineage.withTransformation(t);
      expect(updated.transformations).toHaveLength(1);
      expect(updated.transformations[0]).toEqual(t);
      expect(lineage.transformations).toHaveLength(0);
    });

    it('appends multiple transformations in order', () => {
      const lineage = makeLineage();
      const t1 = makeTransformation();
      const t2: AssetTransformation = { ...makeTransformation(), type: 'metadata_extraction' };
      const updated = lineage.withTransformation(t1).withTransformation(t2);
      expect(updated.transformations).toHaveLength(2);
      expect(updated.transformations[0]?.type).toBe('thumbnail_extraction');
      expect(updated.transformations[1]?.type).toBe('metadata_extraction');
    });
  });

  describe('source field immutability (BR-007)', () => {
    it('assetId is unchanged after withTransformation', () => {
      const lineage = makeLineage();
      const updated = lineage.withTransformation(makeTransformation());
      expect(updated.assetId).toBe(lineage.assetId);
    });

    it('contentHash is unchanged after withTransformation', () => {
      const lineage = makeLineage();
      const updated = lineage.withTransformation(makeTransformation());
      expect(updated.contentHash).toBe(lineage.contentHash);
    });

    it('sourceReference is unchanged after withTransformation', () => {
      const lineage = makeLineage();
      const updated = lineage.withTransformation(makeTransformation());
      expect(updated.sourceReference).toBe(lineage.sourceReference);
    });
  });

  describe('defensive date copy', () => {
    it('mutating ingestedAt source does not affect stored date', () => {
      const mutableDate = new Date('2025-06-01');
      const lineage = AssetLineage.reconstitute({
        assetId: 'a',
        sourceType: AssetSourceType.DirectUpload,
        sourceReference: 'ref',
        ingestedAt: mutableDate,
        contentHash: 'h',
        transformations: [],
      });
      const storedYear = lineage.ingestedAt.getFullYear();
      mutableDate.setFullYear(2000);
      expect(lineage.ingestedAt.getFullYear()).toBe(storedYear);
    });
  });
});
