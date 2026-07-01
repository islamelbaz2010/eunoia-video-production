import { MediaIngestionService } from '../../../src/media/application/MediaIngestionService';
import { MockMediaValidator } from '../../../src/media/adapters/mock/MockMediaValidator';
import { InMemoryVideoAssetRepository } from '../../../src/media/infrastructure/InMemoryVideoAssetRepository';
import { InMemoryProcessingJobRepository } from '../../../src/media/infrastructure/InMemoryProcessingJobRepository';
import { AssetSourceType } from '../../../src/media/domain/models/AssetSourceType';
import { AssetStatus } from '../../../src/media/domain/models/AssetStatus';
import { PIPELINE_EVENT_TYPES } from '../../../src/media/events/PipelineEvents';
import type { IEventBus } from '../../../src/core/events/IEventBus';
import type { ILogger } from '../../../src/shared/logger/ILogger';
import { AppError } from '../../../src/shared/errors/AppError';

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

function makeService() {
  const assetRepo = new InMemoryVideoAssetRepository();
  const jobRepo = new InMemoryProcessingJobRepository();
  const validator = new MockMediaValidator();
  const eventBus = makeEventBus();
  const logger = makeLogger();
  const service = new MediaIngestionService(assetRepo, jobRepo, validator, eventBus, logger);
  return { service, assetRepo, jobRepo, validator, eventBus, logger };
}

const DEFAULT_INPUT = {
  channelId: 'channel-1',
  sourceType: AssetSourceType.DirectUpload,
  sourceReference: '/uploads/video.mp4',
  filename: 'video.mp4',
  fileSizeBytes: 1024 * 1024 * 100, // 100 MB
  mimeType: 'video/mp4',
};

describe('MediaIngestionService', () => {
  describe('ingest', () => {
    it('creates asset and publishes AssetIngested event', async () => {
      const { service, assetRepo, eventBus } = makeService();

      const result = await service.ingest(DEFAULT_INPUT);

      expect(result.isDuplicate).toBe(false);
      expect(result.asset.id).toBeDefined();
      expect(result.asset.status).toBe(AssetStatus.Ingested);
      expect(result.asset.channelId).toBe('channel-1');
      expect(result.asset.filename).toBe('video.mp4');

      const savedAsset = await assetRepo.findById(result.asset.id);
      expect(savedAsset).not.toBeNull();

      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      const publishedEvent = (eventBus.publish as jest.Mock).mock.calls[0][0];
      expect(publishedEvent.eventType).toBe(PIPELINE_EVENT_TYPES.AssetIngested);
      expect((publishedEvent.payload as Record<string, unknown>).assetId).toBe(result.asset.id);
    });

    it('returns isDuplicate=true and publishes DuplicateDetected for matching contentHash', async () => {
      const { service, eventBus } = makeService();

      // First ingestion
      const first = await service.ingest(DEFAULT_INPUT);
      expect(first.isDuplicate).toBe(false);

      (eventBus.publish as jest.Mock).mockClear();

      // Second ingestion with same filename and size
      const second = await service.ingest({
        ...DEFAULT_INPUT,
        sourceReference: '/uploads/video-copy.mp4', // different reference, same content
      });

      expect(second.isDuplicate).toBe(true);
      expect(second.asset.id).toBe(first.asset.id);

      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      const publishedEvent = (eventBus.publish as jest.Mock).mock.calls[0][0];
      expect(publishedEvent.eventType).toBe(PIPELINE_EVENT_TYPES.DuplicateDetected);
    });

    it('does not create a new asset record on duplicate', async () => {
      const { service, assetRepo } = makeService();

      await service.ingest(DEFAULT_INPUT);
      await service.ingest(DEFAULT_INPUT);

      const all = await assetRepo.findAll();
      expect(all).toHaveLength(1);
    });

    it('throws AppError for unsupported file format (e.g., AVI)', async () => {
      const { service } = makeService();

      await expect(
        service.ingest({
          ...DEFAULT_INPUT,
          filename: 'video.avi',
          mimeType: 'video/x-msvideo',
        }),
      ).rejects.toThrow(AppError);
    });

    it('throws AppError for file over 128 GB', async () => {
      const { service } = makeService();
      const oversized = 128 * 1024 * 1024 * 1024 + 1;

      await expect(
        service.ingest({
          ...DEFAULT_INPUT,
          filename: 'huge.mp4',
          fileSizeBytes: oversized,
        }),
      ).rejects.toThrow(AppError);
    });

    it('does not publish AssetIngested if validation fails', async () => {
      const { service, eventBus } = makeService();

      await expect(
        service.ingest({ ...DEFAULT_INPUT, filename: 'bad.avi', mimeType: 'video/x-msvideo' }),
      ).rejects.toThrow();

      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('uses "Validation failed" fallback message when validator returns empty errors array', async () => {
      const assetRepo = new InMemoryVideoAssetRepository();
      const jobRepo = new InMemoryProcessingJobRepository();
      const eventBus = makeEventBus();
      const logger = makeLogger();

      // Custom validator that returns invalid with no error messages
      const emptyErrorsValidator: import('../../../src/media/adapters/IMediaValidator').IMediaValidator = {
        async validate() {
          return {
            valid: false,
            errors: [], // empty — triggers the ?? 'Validation failed' branch
            warnings: [],
            detectedCodec: null,
            detectedMimeType: null,
          };
        },
      };

      const service = new MediaIngestionService(assetRepo, jobRepo, emptyErrorsValidator, eventBus, logger);
      await expect(service.ingest(DEFAULT_INPUT)).rejects.toThrow('Validation failed');
    });

    it('uses unknown codec when validator returns null detectedCodec', async () => {
      const assetRepo = new InMemoryVideoAssetRepository();
      const jobRepo = new InMemoryProcessingJobRepository();
      const eventBus = makeEventBus();
      const logger = makeLogger();

      // Custom validator that returns null codec even for valid files
      const nullCodecValidator: import('../../../src/media/adapters/IMediaValidator').IMediaValidator = {
        async validate() {
          return {
            valid: true,
            errors: [],
            warnings: [],
            detectedCodec: null,
            detectedMimeType: 'video/mp4',
          };
        },
      };

      const service = new MediaIngestionService(assetRepo, jobRepo, nullCodecValidator, eventBus, logger);
      const result = await service.ingest(DEFAULT_INPUT);
      expect(result.asset.codec).toBe('unknown');
      expect(result.isDuplicate).toBe(false);
    });
  });
});
