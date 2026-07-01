import { NotFoundError } from '../../shared/errors/AppError';
import type { ILogger } from '../../shared/logger/ILogger';
import type { IEventBus } from '../../core/events/IEventBus';
import { createDomainEvent } from '../../core/events/DomainEvent';
import type { IVideoAssetRepository } from '../domain/repositories/IVideoAssetRepository';
import type { IProcessingJobRepository } from '../domain/repositories/IProcessingJobRepository';
import { ProcessingJob } from '../domain/models/ProcessingJob';
import { ProcessingJobType } from '../domain/models/ProcessingJobType';
import { AssetStatus } from '../domain/models/AssetStatus';
import { VideoMetadataDraft } from '../domain/models/VideoMetadataDraft';
import type { IAIMetadataExtractor } from '../adapters/IAIMetadataExtractor';
import type { IThumbnailExtractor } from '../adapters/IThumbnailExtractor';
import { PIPELINE_EVENT_TYPES } from '../events/PipelineEvents';

export class MediaProcessingService {
  private readonly logger: ILogger;

  constructor(
    private readonly assetRepo: IVideoAssetRepository,
    private readonly jobRepo: IProcessingJobRepository,
    private readonly metadataExtractor: IAIMetadataExtractor,
    private readonly thumbnailExtractor: IThumbnailExtractor,
    private readonly eventBus: IEventBus,
    logger: ILogger,
    private readonly maxConcurrentJobsPerChannel: number = 5,
  ) {
    this.logger = logger.child({ service: 'MediaProcessingService' });
  }

  async enqueueProcessingJobs(assetId: string, channelId: string): Promise<ProcessingJob[]> {
    this.logger.info({ assetId, channelId }, 'Enqueueing processing jobs');

    const runningJobs = await this.jobRepo.findRunningByChannelId(channelId);
    if (runningJobs.length >= this.maxConcurrentJobsPerChannel) {
      this.logger.warn(
        { channelId, runningCount: runningJobs.length },
        'Concurrent job limit reached; jobs queued as pending',
      );
    }

    const jobTypes = [
      ProcessingJobType.Validation,
      ProcessingJobType.MetadataExtraction,
      ProcessingJobType.ThumbnailExtraction,
    ];

    const savedJobs: ProcessingJob[] = [];
    for (const type of jobTypes) {
      const job = ProcessingJob.create({ assetId, channelId, type, maxAttempts: 3 });
      const saved = await this.jobRepo.save(job);
      savedJobs.push(saved);
    }

    return savedJobs;
  }

  async processValidationJob(jobId: string): Promise<void> {
    const job = await this.jobRepo.findById(jobId);
    if (job === null) throw new NotFoundError('ProcessingJob', jobId);

    const asset = await this.assetRepo.findById(job.assetId);
    if (asset === null) throw new NotFoundError('VideoAsset', job.assetId);

    const startTime = Date.now();
    const startedJob = job.withStarted();
    await this.jobRepo.save(startedJob);

    await this.eventBus.publish(
      createDomainEvent(PIPELINE_EVENT_TYPES.ProcessingStarted, job.assetId, {
        jobId: job.id,
        assetId: job.assetId,
        jobType: job.type,
      }),
    );

    // Mark asset as Processing
    const processingAsset = asset.withStatus(AssetStatus.Processing);
    await this.assetRepo.save(processingAsset);

    const completedJob = startedJob.withCompleted();
    await this.jobRepo.save(completedJob);

    const durationMs = Date.now() - startTime;

    await this.eventBus.publish(
      createDomainEvent(PIPELINE_EVENT_TYPES.ProcessingCompleted, job.assetId, {
        jobId: job.id,
        assetId: job.assetId,
        jobType: job.type,
        durationMs,
      }),
    );

    this.logger.info({ jobId, assetId: job.assetId }, 'Validation job completed');
  }

  async processMetadataJob(jobId: string, extractor: IAIMetadataExtractor): Promise<void> {
    const job = await this.jobRepo.findById(jobId);
    if (job === null) throw new NotFoundError('ProcessingJob', jobId);

    const asset = await this.assetRepo.findById(job.assetId);
    if (asset === null) throw new NotFoundError('VideoAsset', job.assetId);

    const startTime = Date.now();
    const startedJob = job.withStarted();
    await this.jobRepo.save(startedJob);

    await this.eventBus.publish(
      createDomainEvent(PIPELINE_EVENT_TYPES.ProcessingStarted, job.assetId, {
        jobId: job.id,
        assetId: job.assetId,
        jobType: job.type,
      }),
    );

    const result = await extractor.extract({
      assetId: asset.id,
      filename: asset.filename,
      durationSeconds: asset.durationSeconds,
      workingTitle: null,
      creatorNotes: null,
    });

    const draft = VideoMetadataDraft.create({
      assetId: asset.id,
      titleCandidates: result.titleCandidates,
      descriptionDraft: result.descriptionDraft,
      tags: result.tags,
      chapters: result.chapters,
      generatedAt: result.generatedAt,
      modelVersion: result.modelVersion,
    });

    const updatedAsset = asset.withMetadata(draft);
    await this.assetRepo.save(updatedAsset);

    const completedJob = startedJob.withCompleted();
    await this.jobRepo.save(completedJob);

    const durationMs = Date.now() - startTime;

    await this.eventBus.publish(
      createDomainEvent(PIPELINE_EVENT_TYPES.ProcessingCompleted, job.assetId, {
        jobId: job.id,
        assetId: job.assetId,
        jobType: job.type,
        durationMs,
      }),
    );

    await this.eventBus.publish(
      createDomainEvent(PIPELINE_EVENT_TYPES.MetadataReady, job.assetId, {
        assetId: job.assetId,
        extractionId: result.extractionId,
        confidence: result.confidence,
      }),
    );

    this.logger.info({ jobId, assetId: job.assetId }, 'Metadata extraction job completed');
  }

  async processThumbnailJob(jobId: string, extractor: IThumbnailExtractor): Promise<void> {
    const job = await this.jobRepo.findById(jobId);
    if (job === null) throw new NotFoundError('ProcessingJob', jobId);

    const asset = await this.assetRepo.findById(job.assetId);
    if (asset === null) throw new NotFoundError('VideoAsset', job.assetId);

    const startTime = Date.now();
    const startedJob = job.withStarted();
    await this.jobRepo.save(startedJob);

    await this.eventBus.publish(
      createDomainEvent(PIPELINE_EVENT_TYPES.ProcessingStarted, job.assetId, {
        jobId: job.id,
        assetId: job.assetId,
        jobType: job.type,
      }),
    );

    const result = await extractor.extract({
      assetId: asset.id,
      durationSeconds: asset.durationSeconds,
      storageKeyPrefix: `channels/${asset.channelId}/assets/${asset.id}/thumbnails`,
    });

    const updatedAsset = asset.withThumbnailCandidates(result.candidates);
    await this.assetRepo.save(updatedAsset);

    const completedJob = startedJob.withCompleted();
    await this.jobRepo.save(completedJob);

    const durationMs = Date.now() - startTime;

    await this.eventBus.publish(
      createDomainEvent(PIPELINE_EVENT_TYPES.ProcessingCompleted, job.assetId, {
        jobId: job.id,
        assetId: job.assetId,
        jobType: job.type,
        durationMs,
      }),
    );

    await this.eventBus.publish(
      createDomainEvent(PIPELINE_EVENT_TYPES.ThumbnailReady, job.assetId, {
        assetId: job.assetId,
        selectionId: result.selectionId,
        candidateCount: result.candidates.length,
      }),
    );

    this.logger.info({ jobId, assetId: job.assetId }, 'Thumbnail extraction job completed');
  }
}
