import { VideoAsset } from '../../../src/media/domain/models/VideoAsset';
import { AssetStatus } from '../../../src/media/domain/models/AssetStatus';
import { AssetSourceType } from '../../../src/media/domain/models/AssetSourceType';
import { AssetLineage } from '../../../src/media/domain/models/AssetLineage';
import { VideoMetadataDraft } from '../../../src/media/domain/models/VideoMetadataDraft';
import type { QualityWarning } from '../../../src/media/domain/models/QualityWarning';

function makeLineage(): AssetLineage {
  return AssetLineage.create({
    assetId: 'asset-1',
    sourceType: AssetSourceType.DirectUpload,
    sourceReference: '/uploads/video.mp4',
    ingestedAt: new Date(),
    contentHash: 'abc123',
  });
}

function makeAsset(overrides: Partial<Parameters<typeof VideoAsset.create>[0]> = {}): VideoAsset {
  return VideoAsset.create({
    channelId: 'channel-1',
    sourceType: AssetSourceType.DirectUpload,
    sourceReference: '/uploads/video.mp4',
    contentHash: 'abc123',
    filename: 'video.mp4',
    fileSizeBytes: 1024 * 1024 * 100,
    durationSeconds: 300,
    resolution: { width: 1920, height: 1080 },
    frameRate: 30,
    codec: 'h264',
    metadata: null,
    thumbnailCandidates: [],
    lineage: makeLineage(),
    ...overrides,
  });
}

function makeDraft(): VideoMetadataDraft {
  return VideoMetadataDraft.create({
    assetId: 'asset-1',
    titleCandidates: [{ text: 'Title 1', score: 0.9, rationale: 'reason' }],
    descriptionDraft: 'Description',
    tags: ['tag1', 'tag2'],
    chapters: [{ timestampSeconds: 0, title: 'Intro' }],
    generatedAt: new Date(),
    modelVersion: 'v1',
  });
}

describe('VideoAsset', () => {
  describe('create', () => {
    it('sets Ingested status, generates id, ingestedAt as Date, processedAt as null, qualityWarnings as empty', () => {
      const asset = makeAsset();
      expect(asset.id).toBeDefined();
      expect(asset.status).toBe(AssetStatus.Ingested);
      expect(asset.ingestedAt).toBeInstanceOf(Date);
      expect(asset.processedAt).toBeNull();
      expect(asset.qualityWarnings).toHaveLength(0);
    });

    it('stores all provided props', () => {
      const asset = makeAsset();
      expect(asset.channelId).toBe('channel-1');
      expect(asset.filename).toBe('video.mp4');
      expect(asset.codec).toBe('h264');
      expect(asset.resolution).toEqual({ width: 1920, height: 1080 });
    });
  });

  describe('reconstitute', () => {
    it('restores all props from persisted state', () => {
      const now = new Date('2025-01-01');
      const asset = VideoAsset.reconstitute({
        id: 'asset-xyz',
        channelId: 'channel-1',
        sourceType: AssetSourceType.GoogleDrive,
        sourceReference: 'drive-file-id',
        contentHash: 'hash123',
        filename: 'video.mp4',
        fileSizeBytes: 500,
        durationSeconds: 120,
        resolution: { width: 1280, height: 720 },
        frameRate: 24,
        codec: 'h264',
        status: AssetStatus.Ready,
        metadata: null,
        thumbnailCandidates: [],
        lineage: makeLineage(),
        qualityWarnings: [],
        ingestedAt: now,
        processedAt: now,
      });
      expect(asset.id).toBe('asset-xyz');
      expect(asset.status).toBe(AssetStatus.Ready);
      expect(asset.processedAt).not.toBeNull();
    });
  });

  describe('defensive date copy', () => {
    it('mutating ingestedAt after construction does not change stored value', () => {
      const mutableDate = new Date('2025-06-01');
      const lineage = AssetLineage.create({
        assetId: 'a',
        sourceType: AssetSourceType.DirectUpload,
        sourceReference: 'ref',
        ingestedAt: new Date(),
        contentHash: 'h',
      });
      const asset = VideoAsset.reconstitute({
        id: 'x',
        channelId: 'ch',
        sourceType: AssetSourceType.DirectUpload,
        sourceReference: 'ref',
        contentHash: 'hash',
        filename: 'f.mp4',
        fileSizeBytes: 100,
        durationSeconds: 10,
        resolution: { width: 1920, height: 1080 },
        frameRate: 30,
        codec: 'h264',
        status: AssetStatus.Ingested,
        metadata: null,
        thumbnailCandidates: [],
        lineage,
        qualityWarnings: [],
        ingestedAt: mutableDate,
        processedAt: null,
      });
      const storedYear = asset.ingestedAt.getFullYear();
      mutableDate.setFullYear(2000);
      expect(asset.ingestedAt.getFullYear()).toBe(storedYear);
    });
  });

  describe('withStatus', () => {
    it('returns new instance with updated status, original unchanged', () => {
      const asset = makeAsset();
      const updated = asset.withStatus(AssetStatus.Processing);
      expect(updated.status).toBe(AssetStatus.Processing);
      expect(asset.status).toBe(AssetStatus.Ingested);
      expect(updated.id).toBe(asset.id);
    });
  });

  describe('withMetadata', () => {
    it('returns new asset with metadata set', () => {
      const asset = makeAsset();
      const draft = makeDraft();
      const updated = asset.withMetadata(draft);
      expect(updated.metadata).not.toBeNull();
      expect(asset.metadata).toBeNull();
    });
  });

  describe('withQualityWarning', () => {
    it('appends warning, original unchanged', () => {
      const asset = makeAsset();
      const warning: QualityWarning = { code: 'LOW_RESOLUTION', message: 'Resolution too low' };
      const updated = asset.withQualityWarning(warning);
      expect(updated.qualityWarnings).toHaveLength(1);
      expect(updated.qualityWarnings[0]).toEqual(warning);
      expect(asset.qualityWarnings).toHaveLength(0);
    });
  });

  describe('isReadyForPublishing', () => {
    it('returns false when status is not Ready', () => {
      const asset = makeAsset();
      expect(asset.isReadyForPublishing()).toBe(false);
    });

    it('returns false when status is Ready but metadata not accepted', () => {
      const asset = makeAsset().withStatus(AssetStatus.Ready).withMetadata(makeDraft());
      expect(asset.isReadyForPublishing()).toBe(false);
    });

    it('returns true when status is Ready and metadata is accepted', () => {
      const draft = makeDraft().withAcceptance('Title', 'Desc', ['tag'], []);
      const asset = makeAsset().withStatus(AssetStatus.Ready).withMetadata(draft);
      expect(asset.isReadyForPublishing()).toBe(true);
    });

    it('returns false when status is Ready but metadata is null', () => {
      const asset = makeAsset().withStatus(AssetStatus.Ready);
      expect(asset.isReadyForPublishing()).toBe(false);
    });
  });

  describe('withLineage', () => {
    it('returns new asset with updated lineage, original unchanged', () => {
      const asset = makeAsset();
      const newLineage = AssetLineage.create({
        assetId: 'asset-2',
        sourceType: AssetSourceType.GoogleDrive,
        sourceReference: 'drive-file-id',
        ingestedAt: new Date(),
        contentHash: 'newHash',
      });
      const updated = asset.withLineage(newLineage);
      expect(updated.lineage.contentHash).toBe('newHash');
      expect(asset.lineage.contentHash).toBe('abc123');
      expect(updated.id).toBe(asset.id);
    });
  });

  describe('withProcessedAt', () => {
    it('returns new asset with processedAt set', () => {
      const asset = makeAsset();
      const now = new Date();
      const updated = asset.withProcessedAt(now);
      expect(updated.processedAt).not.toBeNull();
      expect(updated.processedAt?.getTime()).toBeCloseTo(now.getTime(), -2);
      expect(asset.processedAt).toBeNull();
    });

    it('copies the date defensively', () => {
      const asset = makeAsset();
      const mutableDate = new Date('2025-06-01');
      const updated = asset.withProcessedAt(mutableDate);
      mutableDate.setFullYear(2000);
      expect(updated.processedAt?.getFullYear()).toBe(2025);
    });
  });

  describe('withThumbnailCandidates', () => {
    it('replaces thumbnail candidates array', () => {
      const asset = makeAsset();
      const { ThumbnailCandidate } = require('../../../src/media/domain/models/ThumbnailCandidate');
      const candidate = ThumbnailCandidate.create({
        videoAssetId: asset.id,
        timestampSeconds: 10,
        storageKey: 'key',
        visualQualityScore: 0.9,
        narrativeRelevanceScore: 0.8,
        aestheticConsistencyScore: 0.7,
        compositeScore: 0.8,
        isRecommended: true,
      });
      const updated = asset.withThumbnailCandidates([candidate]);
      expect(updated.thumbnailCandidates).toHaveLength(1);
      expect(asset.thumbnailCandidates).toHaveLength(0);
    });
  });

  describe('chained with* methods exercising toProps with non-null processedAt', () => {
    it('withProcessedAt then withStatus exercises toProps with non-null processedAt', () => {
      const now = new Date();
      const asset = makeAsset().withProcessedAt(now).withStatus(AssetStatus.Ready);
      expect(asset.processedAt).not.toBeNull();
      expect(asset.status).toBe(AssetStatus.Ready);
    });
  });

  describe('meetsMinimumQuality', () => {
    it('returns true for 1080p at 30fps', () => {
      const asset = makeAsset({ resolution: { width: 1920, height: 1080 }, frameRate: 30 });
      expect(asset.meetsMinimumQuality()).toBe(true);
    });

    it('returns false for resolution below 720p', () => {
      const asset = makeAsset({ resolution: { width: 640, height: 480 }, frameRate: 30 });
      expect(asset.meetsMinimumQuality()).toBe(false);
    });

    it('returns false for frame rate below 24fps', () => {
      const asset = makeAsset({ resolution: { width: 1920, height: 1080 }, frameRate: 15 });
      expect(asset.meetsMinimumQuality()).toBe(false);
    });

    it('returns true at exactly 720p and 24fps', () => {
      const asset = makeAsset({ resolution: { width: 1280, height: 720 }, frameRate: 24 });
      expect(asset.meetsMinimumQuality()).toBe(true);
    });
  });
});
