import { MetadataAcceptanceService } from '../../../src/media/application/MetadataAcceptanceService';
import { InMemoryVideoAssetRepository } from '../../../src/media/infrastructure/InMemoryVideoAssetRepository';
import { VideoAsset } from '../../../src/media/domain/models/VideoAsset';
import { VideoMetadataDraft } from '../../../src/media/domain/models/VideoMetadataDraft';
import { AssetLineage } from '../../../src/media/domain/models/AssetLineage';
import { AssetSourceType } from '../../../src/media/domain/models/AssetSourceType';
import { AssetStatus } from '../../../src/media/domain/models/AssetStatus';
import { PIPELINE_EVENT_TYPES } from '../../../src/media/events/PipelineEvents';
import { AppError, NotFoundError } from '../../../src/shared/errors/AppError';
import type { IEventBus } from '../../../src/core/events/IEventBus';
import type { ILogger } from '../../../src/shared/logger/ILogger';

function makeLogger(): jest.Mocked<ILogger> {
  return {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: jest.fn().mockReturnThis(),
  } as unknown as jest.Mocked<ILogger>;
}

function makeEventBus(): jest.Mocked<IEventBus> {
  return {
    publish: jest.fn().mockResolvedValue(undefined),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  };
}

function makeAsset(channelId = 'channel-1'): VideoAsset {
  return VideoAsset.create({
    channelId,
    sourceType: AssetSourceType.DirectUpload,
    sourceReference: '/uploads/video.mp4',
    contentHash: 'abc123',
    filename: 'video.mp4',
    fileSizeBytes: 1024 * 1024,
    durationSeconds: 300,
    resolution: { width: 1920, height: 1080 },
    frameRate: 30,
    codec: 'h264',
    metadata: null,
    thumbnailCandidates: [],
    lineage: AssetLineage.create({
      assetId: 'placeholder',
      sourceType: AssetSourceType.DirectUpload,
      sourceReference: '/uploads/video.mp4',
      ingestedAt: new Date(),
      contentHash: 'abc123',
    }),
  });
}

function makeDraft(assetId: string): VideoMetadataDraft {
  return VideoMetadataDraft.create({
    assetId,
    titleCandidates: [{ text: 'Title A', score: 0.9, rationale: 'reason' }],
    descriptionDraft: 'Description',
    tags: ['tag1'],
    chapters: [{ timestampSeconds: 0, title: 'Intro' }],
    generatedAt: new Date(),
    modelVersion: 'v1',
  });
}

const ACCEPTANCE = {
  title: 'My Accepted Title',
  description: 'My accepted description',
  tags: ['tag1', 'tag2'],
  chapters: [{ timestampSeconds: 0, title: 'Intro' }],
};

describe('MetadataAcceptanceService', () => {
  function makeService() {
    const assetRepo = new InMemoryVideoAssetRepository();
    const eventBus = makeEventBus();
    const logger = makeLogger();
    const service = new MetadataAcceptanceService(assetRepo, eventBus, logger);
    return { service, assetRepo, eventBus };
  }

  describe('acceptMetadata', () => {
    it('updates draft to accepted state and sets asset to Ready', async () => {
      const { service, assetRepo } = makeService();

      const asset = makeAsset();
      const draft = makeDraft(asset.id);
      const assetWithDraft = asset.withMetadata(draft);
      await assetRepo.save(assetWithDraft);

      const result = await service.acceptMetadata(asset.id, ACCEPTANCE);

      expect(result.status).toBe(AssetStatus.Ready);
      expect(result.metadata?.isAccepted()).toBe(true);
      expect(result.metadata?.acceptedTitle).toBe('My Accepted Title');
    });

    it('throws NotFoundError for unknown assetId', async () => {
      const { service } = makeService();

      await expect(
        service.acceptMetadata('non-existent-id', ACCEPTANCE),
      ).rejects.toThrow(NotFoundError);
    });

    it('throws AppError when no metadata draft exists', async () => {
      const { service, assetRepo } = makeService();

      const asset = makeAsset();
      await assetRepo.save(asset);

      await expect(
        service.acceptMetadata(asset.id, ACCEPTANCE),
      ).rejects.toThrow(AppError);
    });

    it('throws AppError when metadata already accepted', async () => {
      const { service, assetRepo } = makeService();

      const asset = makeAsset();
      const draft = makeDraft(asset.id).withAcceptance('Title', 'Desc', [], []);
      const assetWithAccepted = asset.withMetadata(draft);
      await assetRepo.save(assetWithAccepted);

      await expect(
        service.acceptMetadata(asset.id, ACCEPTANCE),
      ).rejects.toThrow(AppError);
    });

    it('publishes MetadataAccepted event', async () => {
      const { service, assetRepo, eventBus } = makeService();

      const asset = makeAsset();
      const draft = makeDraft(asset.id);
      await assetRepo.save(asset.withMetadata(draft));

      await service.acceptMetadata(asset.id, ACCEPTANCE);

      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      const event = (eventBus.publish as jest.Mock).mock.calls[0][0];
      expect(event.eventType).toBe(PIPELINE_EVENT_TYPES.MetadataAccepted);
      expect((event.payload as Record<string, unknown>).acceptedTitle).toBe('My Accepted Title');
    });

    it('saves the updated asset to the repository', async () => {
      const { service, assetRepo } = makeService();

      const asset = makeAsset();
      const draft = makeDraft(asset.id);
      await assetRepo.save(asset.withMetadata(draft));

      await service.acceptMetadata(asset.id, ACCEPTANCE);

      const saved = await assetRepo.findById(asset.id);
      expect(saved?.status).toBe(AssetStatus.Ready);
      expect(saved?.metadata?.isAccepted()).toBe(true);
    });
  });
});
