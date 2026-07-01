import { MediaProcessingService } from '../../../src/media/application/MediaProcessingService';
import { MockAIMetadataExtractor } from '../../../src/media/adapters/mock/MockAIMetadataExtractor';
import { MockThumbnailExtractor } from '../../../src/media/adapters/mock/MockThumbnailExtractor';
import { InMemoryVideoAssetRepository } from '../../../src/media/infrastructure/InMemoryVideoAssetRepository';
import { InMemoryProcessingJobRepository } from '../../../src/media/infrastructure/InMemoryProcessingJobRepository';
import { VideoAsset } from '../../../src/media/domain/models/VideoAsset';
import { AssetLineage } from '../../../src/media/domain/models/AssetLineage';
import { AssetSourceType } from '../../../src/media/domain/models/AssetSourceType';
import { ProcessingJobType } from '../../../src/media/domain/models/ProcessingJobType';
import { JobStatus } from '../../../src/core/queue/types';
import { PIPELINE_EVENT_TYPES } from '../../../src/media/events/PipelineEvents';
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

function makeService(maxConcurrent = 5) {
  const assetRepo = new InMemoryVideoAssetRepository();
  const jobRepo = new InMemoryProcessingJobRepository();
  const metadataExtractor = new MockAIMetadataExtractor();
  const thumbnailExtractor = new MockThumbnailExtractor();
  const eventBus = makeEventBus();
  const logger = makeLogger();
  const service = new MediaProcessingService(
    assetRepo,
    jobRepo,
    metadataExtractor,
    thumbnailExtractor,
    eventBus,
    logger,
    maxConcurrent,
  );
  return { service, assetRepo, jobRepo, metadataExtractor, thumbnailExtractor, eventBus };
}

describe('MediaProcessingService', () => {
  describe('enqueueProcessingJobs', () => {
    it('creates 3 jobs: Validation, MetadataExtraction, ThumbnailExtraction', async () => {
      const { service, jobRepo, assetRepo } = makeService();
      const asset = makeAsset();
      await assetRepo.save(asset);

      const jobs = await service.enqueueProcessingJobs(asset.id, asset.channelId);

      expect(jobs).toHaveLength(3);
      const types = jobs.map(j => j.type);
      expect(types).toContain(ProcessingJobType.Validation);
      expect(types).toContain(ProcessingJobType.MetadataExtraction);
      expect(types).toContain(ProcessingJobType.ThumbnailExtraction);

      const allJobs = await jobRepo.findAll();
      expect(allJobs).toHaveLength(3);
      allJobs.forEach(j => expect(j.status).toBe(JobStatus.Pending));
    });

    it('respects maxConcurrentJobsPerChannel limit by still creating jobs but logging warning', async () => {
      const { service, assetRepo, jobRepo } = makeService(1);
      const asset = makeAsset();
      await assetRepo.save(asset);

      // Manually add a running job to hit the limit
      const { ProcessingJob } = await import('../../../src/media/domain/models/ProcessingJob');
      const runningJob = ProcessingJob.create({
        assetId: asset.id,
        channelId: asset.channelId,
        type: ProcessingJobType.Validation,
      }).withStarted();
      await jobRepo.save(runningJob);

      // Even with limit exceeded, jobs are created (they are pending)
      const jobs = await service.enqueueProcessingJobs(asset.id, asset.channelId);
      expect(jobs).toHaveLength(3);
      jobs.forEach(j => expect(j.status).toBe(JobStatus.Pending));
    });
  });

  describe('processMetadataJob', () => {
    it('calls extractor, updates asset with metadata, publishes MetadataReady', async () => {
      const { service, assetRepo, jobRepo, eventBus } = makeService();
      const asset = makeAsset();
      await assetRepo.save(asset);

      const jobs = await service.enqueueProcessingJobs(asset.id, asset.channelId);
      const metadataJob = jobs.find(j => j.type === ProcessingJobType.MetadataExtraction)!;

      const extractor = new MockAIMetadataExtractor();
      await service.processMetadataJob(metadataJob.id, extractor);

      const updatedAsset = await assetRepo.findById(asset.id);
      expect(updatedAsset?.metadata).not.toBeNull();
      expect(updatedAsset?.metadata?.titleCandidates).toHaveLength(5);

      const eventTypes = (eventBus.publish as jest.Mock).mock.calls.map(
        (call: unknown[]) => (call[0] as { eventType: string }).eventType,
      );
      expect(eventTypes).toContain(PIPELINE_EVENT_TYPES.MetadataReady);
      expect(eventTypes).toContain(PIPELINE_EVENT_TYPES.ProcessingStarted);
      expect(eventTypes).toContain(PIPELINE_EVENT_TYPES.ProcessingCompleted);
    });

    it('marks job as Completed after processing', async () => {
      const { service, assetRepo, jobRepo } = makeService();
      const asset = makeAsset();
      await assetRepo.save(asset);

      const jobs = await service.enqueueProcessingJobs(asset.id, asset.channelId);
      const metadataJob = jobs.find(j => j.type === ProcessingJobType.MetadataExtraction)!;

      await service.processMetadataJob(metadataJob.id, new MockAIMetadataExtractor());

      const completedJob = await jobRepo.findById(metadataJob.id);
      expect(completedJob?.status).toBe(JobStatus.Completed);
    });
  });

  describe('processThumbnailJob', () => {
    it('calls extractor, updates asset with candidates, publishes ThumbnailReady', async () => {
      const { service, assetRepo, jobRepo, eventBus } = makeService();
      const asset = makeAsset();
      await assetRepo.save(asset);

      const jobs = await service.enqueueProcessingJobs(asset.id, asset.channelId);
      const thumbnailJob = jobs.find(j => j.type === ProcessingJobType.ThumbnailExtraction)!;

      await service.processThumbnailJob(thumbnailJob.id, new MockThumbnailExtractor());

      const updatedAsset = await assetRepo.findById(asset.id);
      expect(updatedAsset?.thumbnailCandidates).toHaveLength(5);

      const eventTypes = (eventBus.publish as jest.Mock).mock.calls.map(
        (call: unknown[]) => (call[0] as { eventType: string }).eventType,
      );
      expect(eventTypes).toContain(PIPELINE_EVENT_TYPES.ThumbnailReady);
    });

    it('marks job as Completed after processing', async () => {
      const { service, assetRepo, jobRepo } = makeService();
      const asset = makeAsset();
      await assetRepo.save(asset);

      const jobs = await service.enqueueProcessingJobs(asset.id, asset.channelId);
      const thumbnailJob = jobs.find(j => j.type === ProcessingJobType.ThumbnailExtraction)!;

      await service.processThumbnailJob(thumbnailJob.id, new MockThumbnailExtractor());

      const completedJob = await jobRepo.findById(thumbnailJob.id);
      expect(completedJob?.status).toBe(JobStatus.Completed);
    });
  });

  describe('processMetadataJob error paths', () => {
    it('throws NotFoundError when job not found', async () => {
      const { service } = makeService();
      const { NotFoundError } = await import('../../../src/shared/errors/AppError');
      await expect(
        service.processMetadataJob('non-existent-job', new MockAIMetadataExtractor()),
      ).rejects.toThrow(NotFoundError);
    });

    it('throws NotFoundError when asset not found for job', async () => {
      const { service, jobRepo } = makeService();
      const { NotFoundError } = await import('../../../src/shared/errors/AppError');
      const { ProcessingJob } = await import('../../../src/media/domain/models/ProcessingJob');
      const job = ProcessingJob.create({
        assetId: 'non-existent-asset',
        channelId: 'channel-1',
        type: ProcessingJobType.MetadataExtraction,
      });
      await jobRepo.save(job);
      await expect(
        service.processMetadataJob(job.id, new MockAIMetadataExtractor()),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('processThumbnailJob error paths', () => {
    it('throws NotFoundError when job not found', async () => {
      const { service } = makeService();
      const { NotFoundError } = await import('../../../src/shared/errors/AppError');
      await expect(
        service.processThumbnailJob('non-existent-job', new MockThumbnailExtractor()),
      ).rejects.toThrow(NotFoundError);
    });

    it('throws NotFoundError when asset not found for job', async () => {
      const { service, jobRepo } = makeService();
      const { NotFoundError } = await import('../../../src/shared/errors/AppError');
      const { ProcessingJob } = await import('../../../src/media/domain/models/ProcessingJob');
      const job = ProcessingJob.create({
        assetId: 'non-existent-asset',
        channelId: 'channel-1',
        type: ProcessingJobType.ThumbnailExtraction,
      });
      await jobRepo.save(job);
      await expect(
        service.processThumbnailJob(job.id, new MockThumbnailExtractor()),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('processValidationJob error paths', () => {
    it('throws NotFoundError when job not found', async () => {
      const { service } = makeService();
      const { NotFoundError } = await import('../../../src/shared/errors/AppError');
      await expect(
        service.processValidationJob('non-existent-job'),
      ).rejects.toThrow(NotFoundError);
    });

    it('throws NotFoundError when asset not found for job', async () => {
      const { service, jobRepo } = makeService();
      const { NotFoundError } = await import('../../../src/shared/errors/AppError');
      const { ProcessingJob } = await import('../../../src/media/domain/models/ProcessingJob');
      const job = ProcessingJob.create({
        assetId: 'non-existent-asset',
        channelId: 'channel-1',
        type: ProcessingJobType.Validation,
      });
      await jobRepo.save(job);
      await expect(
        service.processValidationJob(job.id),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('processValidationJob', () => {
    it('marks asset as Processing and job as Completed, publishes events', async () => {
      const { service, assetRepo, jobRepo, eventBus } = makeService();
      const asset = makeAsset();
      await assetRepo.save(asset);

      const jobs = await service.enqueueProcessingJobs(asset.id, asset.channelId);
      const validationJob = jobs.find(j => j.type === ProcessingJobType.Validation)!;

      await service.processValidationJob(validationJob.id);

      const updatedAsset = await assetRepo.findById(asset.id);
      const { AssetStatus } = await import('../../../src/media/domain/models/AssetStatus');
      expect(updatedAsset?.status).toBe(AssetStatus.Processing);

      const completedJob = await jobRepo.findById(validationJob.id);
      expect(completedJob?.status).toBe(JobStatus.Completed);

      const eventTypes = (eventBus.publish as jest.Mock).mock.calls.map(
        (call: unknown[]) => (call[0] as { eventType: string }).eventType,
      );
      expect(eventTypes).toContain(PIPELINE_EVENT_TYPES.ProcessingStarted);
      expect(eventTypes).toContain(PIPELINE_EVENT_TYPES.ProcessingCompleted);
    });
  });
});
