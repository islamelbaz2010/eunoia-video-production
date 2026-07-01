import { InMemoryVideoAssetRepository } from '../../../src/media/infrastructure/InMemoryVideoAssetRepository';
import { VideoAsset } from '../../../src/media/domain/models/VideoAsset';
import { AssetLineage } from '../../../src/media/domain/models/AssetLineage';
import { AssetSourceType } from '../../../src/media/domain/models/AssetSourceType';
import { AssetStatus } from '../../../src/media/domain/models/AssetStatus';

function makeLineage(): AssetLineage {
  return AssetLineage.create({
    assetId: 'placeholder',
    sourceType: AssetSourceType.DirectUpload,
    sourceReference: '/uploads/video.mp4',
    ingestedAt: new Date(),
    contentHash: 'abc123',
  });
}

function makeAsset(overrides: {
  channelId?: string;
  contentHash?: string;
  filename?: string;
} = {}): VideoAsset {
  return VideoAsset.create({
    channelId: overrides.channelId ?? 'channel-1',
    sourceType: AssetSourceType.DirectUpload,
    sourceReference: '/uploads/video.mp4',
    contentHash: overrides.contentHash ?? 'default-hash',
    filename: overrides.filename ?? 'video.mp4',
    fileSizeBytes: 1024,
    durationSeconds: 60,
    resolution: { width: 1920, height: 1080 },
    frameRate: 30,
    codec: 'h264',
    metadata: null,
    thumbnailCandidates: [],
    lineage: makeLineage(),
  });
}

describe('InMemoryVideoAssetRepository', () => {
  describe('save', () => {
    it('stores and returns the asset', async () => {
      const repo = new InMemoryVideoAssetRepository();
      const asset = makeAsset();
      const saved = await repo.save(asset);
      expect(saved).toBe(asset);
    });

    it('overwrites the asset on re-save', async () => {
      const repo = new InMemoryVideoAssetRepository();
      const asset = makeAsset();
      await repo.save(asset);
      const updated = asset.withStatus(AssetStatus.Processing);
      await repo.save(updated);
      const found = await repo.findById(asset.id);
      expect(found?.status).toBe(AssetStatus.Processing);
    });
  });

  describe('findById', () => {
    it('returns asset by id', async () => {
      const repo = new InMemoryVideoAssetRepository();
      const asset = makeAsset();
      await repo.save(asset);
      const found = await repo.findById(asset.id);
      expect(found?.id).toBe(asset.id);
    });

    it('returns null for unknown id', async () => {
      const repo = new InMemoryVideoAssetRepository();
      const found = await repo.findById('non-existent');
      expect(found).toBeNull();
    });
  });

  describe('findByContentHash', () => {
    it('returns existing asset by content hash', async () => {
      const repo = new InMemoryVideoAssetRepository();
      const asset = makeAsset({ contentHash: 'unique-hash-123' });
      await repo.save(asset);
      const found = await repo.findByContentHash('unique-hash-123');
      expect(found?.id).toBe(asset.id);
    });

    it('returns null for unknown hash', async () => {
      const repo = new InMemoryVideoAssetRepository();
      const found = await repo.findByContentHash('non-existent-hash');
      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    it('returns all assets without filter', async () => {
      const repo = new InMemoryVideoAssetRepository();
      const a1 = makeAsset({ contentHash: 'h1' });
      const a2 = makeAsset({ contentHash: 'h2', channelId: 'channel-2' });
      await repo.save(a1);
      await repo.save(a2);
      const all = await repo.findAll();
      expect(all).toHaveLength(2);
    });

    it('filters by channelId', async () => {
      const repo = new InMemoryVideoAssetRepository();
      const a1 = makeAsset({ contentHash: 'h1', channelId: 'channel-1' });
      const a2 = makeAsset({ contentHash: 'h2', channelId: 'channel-2' });
      await repo.save(a1);
      await repo.save(a2);
      const result = await repo.findAll({ channelId: 'channel-1' });
      expect(result).toHaveLength(1);
      expect(result[0]?.channelId).toBe('channel-1');
    });

    it('filters by status', async () => {
      const repo = new InMemoryVideoAssetRepository();
      const a1 = makeAsset({ contentHash: 'h1' });
      const a2 = makeAsset({ contentHash: 'h2' }).withStatus(AssetStatus.Processing);
      await repo.save(a1);
      await repo.save(a2);
      const result = await repo.findAll({ status: AssetStatus.Processing });
      expect(result).toHaveLength(1);
      expect(result[0]?.status).toBe(AssetStatus.Processing);
    });

    it('returns empty array when no assets match filter', async () => {
      const repo = new InMemoryVideoAssetRepository();
      const result = await repo.findAll({ channelId: 'non-existent' });
      expect(result).toHaveLength(0);
    });
  });

  describe('delete', () => {
    it('removes asset from store', async () => {
      const repo = new InMemoryVideoAssetRepository();
      const asset = makeAsset();
      await repo.save(asset);
      await repo.delete(asset.id);
      const found = await repo.findById(asset.id);
      expect(found).toBeNull();
    });
  });
});
