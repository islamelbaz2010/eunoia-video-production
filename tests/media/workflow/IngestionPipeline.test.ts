import { IngestionPipeline } from '../../../src/media/workflow/IngestionPipeline';
import { MediaIngestionService } from '../../../src/media/application/MediaIngestionService';
import { MediaProcessingService } from '../../../src/media/application/MediaProcessingService';
import { MockMediaValidator } from '../../../src/media/adapters/mock/MockMediaValidator';
import { MockAIMetadataExtractor } from '../../../src/media/adapters/mock/MockAIMetadataExtractor';
import { MockThumbnailExtractor } from '../../../src/media/adapters/mock/MockThumbnailExtractor';
import { InMemoryVideoAssetRepository } from '../../../src/media/infrastructure/InMemoryVideoAssetRepository';
import { InMemoryProcessingJobRepository } from '../../../src/media/infrastructure/InMemoryProcessingJobRepository';
import { AssetSourceType } from '../../../src/media/domain/models/AssetSourceType';
import { AppError } from '../../../src/shared/errors/AppError';
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

function makePipeline() {
  const assetRepo = new InMemoryVideoAssetRepository();
  const jobRepo = new InMemoryProcessingJobRepository();
  const validator = new MockMediaValidator();
  const metadataExtractor = new MockAIMetadataExtractor();
  const thumbnailExtractor = new MockThumbnailExtractor();
  const eventBus = makeEventBus();
  const logger = makeLogger();

  const ingestionService = new MediaIngestionService(assetRepo, jobRepo, validator, eventBus, logger);
  const processingService = new MediaProcessingService(
    assetRepo,
    jobRepo,
    metadataExtractor,
    thumbnailExtractor,
    eventBus,
    logger,
  );

  const pipeline = new IngestionPipeline(
    ingestionService,
    processingService,
    metadataExtractor,
    thumbnailExtractor,
    logger,
  );

  return { pipeline, assetRepo, jobRepo, eventBus };
}

const DEFAULT_INPUT = {
  channelId: 'channel-1',
  sourceType: AssetSourceType.DirectUpload,
  sourceReference: '/uploads/video.mp4',
  filename: 'video.mp4',
  fileSizeBytes: 1024 * 1024 * 100,
  mimeType: 'video/mp4',
};

describe('IngestionPipeline', () => {
  describe('run', () => {
    it('ingests file and enqueues 3 processing jobs', async () => {
      const { pipeline, jobRepo } = makePipeline();

      const result = await pipeline.run(DEFAULT_INPUT);

      expect(result.isDuplicate).toBe(false);
      expect(result.asset.id).toBeDefined();
      expect(result.jobs).toHaveLength(3);

      const allJobs = await jobRepo.findAll();
      expect(allJobs).toHaveLength(3);
    });

    it('returns empty jobs array for duplicate', async () => {
      const { pipeline } = makePipeline();

      // First run
      const first = await pipeline.run(DEFAULT_INPUT);
      expect(first.isDuplicate).toBe(false);
      expect(first.jobs).toHaveLength(3);

      // Second run with same content
      const second = await pipeline.run({
        ...DEFAULT_INPUT,
        sourceReference: '/uploads/video-dup.mp4',
      });

      expect(second.isDuplicate).toBe(true);
      expect(second.jobs).toHaveLength(0);
      expect(second.asset.id).toBe(first.asset.id);
    });

    it('throws AppError for invalid file format', async () => {
      const { pipeline } = makePipeline();

      await expect(
        pipeline.run({
          ...DEFAULT_INPUT,
          filename: 'video.avi',
          mimeType: 'video/x-msvideo',
        }),
      ).rejects.toThrow(AppError);
    });
  });
});
