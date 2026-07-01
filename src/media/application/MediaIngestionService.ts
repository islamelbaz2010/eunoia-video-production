import { createHash } from 'crypto';
import { AppError } from '../../shared/errors/AppError';
import type { ILogger } from '../../shared/logger/ILogger';
import type { IEventBus } from '../../core/events/IEventBus';
import { createDomainEvent } from '../../core/events/DomainEvent';
import type { IVideoAssetRepository } from '../domain/repositories/IVideoAssetRepository';
import type { IProcessingJobRepository } from '../domain/repositories/IProcessingJobRepository';
import { AssetLineage } from '../domain/models/AssetLineage';
import { VideoAsset } from '../domain/models/VideoAsset';
import type { AssetSourceType } from '../domain/models/AssetSourceType';
import type { IMediaValidator } from '../adapters/IMediaValidator';
import { PIPELINE_EVENT_TYPES } from '../events/PipelineEvents';

export interface IngestInput {
  channelId: string;
  sourceType: AssetSourceType;
  sourceReference: string;
  filename: string;
  fileSizeBytes: number;
  mimeType: string;
  workingTitle?: string;
  notes?: string;
}

export interface IngestResult {
  asset: VideoAsset;
  isDuplicate: boolean;
}

export class MediaIngestionService {
  private readonly logger: ILogger;

  constructor(
    private readonly assetRepo: IVideoAssetRepository,
    private readonly jobRepo: IProcessingJobRepository,
    private readonly validator: IMediaValidator,
    private readonly eventBus: IEventBus,
    logger: ILogger,
  ) {
    this.logger = logger.child({ service: 'MediaIngestionService' });
  }

  async ingest(input: IngestInput): Promise<IngestResult> {
    this.logger.info(
      { channelId: input.channelId, filename: input.filename },
      'Ingesting media asset',
    );

    // 1. Compute content hash
    const contentHash = createHash('sha256')
      .update(`${input.filename}:${input.fileSizeBytes}`)
      .digest('hex');

    // 2. Deduplication check
    const existing = await this.assetRepo.findByContentHash(contentHash);
    if (existing !== null) {
      this.logger.info(
        { existingAssetId: existing.id, contentHash },
        'Duplicate asset detected',
      );

      await this.eventBus.publish(
        createDomainEvent(PIPELINE_EVENT_TYPES.DuplicateDetected, existing.id, {
          newSourceReference: input.sourceReference,
          existingAssetId: existing.id,
        }),
      );

      return { asset: existing, isDuplicate: true };
    }

    // 3. Validate
    const validationResult = await this.validator.validate(
      input.filename,
      input.fileSizeBytes,
      input.mimeType,
    );

    if (!validationResult.valid) {
      const reason = validationResult.errors[0] ?? 'Validation failed';
      this.logger.warn({ filename: input.filename, reason }, 'Media validation failed');
      throw new AppError(reason, 'VALIDATION_FAILED');
    }

    // 4. Create lineage
    const lineage = AssetLineage.create({
      assetId: '', // will be updated after asset creation; using placeholder
      sourceType: input.sourceType,
      sourceReference: input.sourceReference,
      ingestedAt: new Date(),
      contentHash,
    });

    // 5. Create asset (use default resolution/frameRate/codec from input, or defaults)
    const asset = VideoAsset.create({
      channelId: input.channelId,
      sourceType: input.sourceType,
      sourceReference: input.sourceReference,
      contentHash,
      filename: input.filename,
      fileSizeBytes: input.fileSizeBytes,
      durationSeconds: 0,
      resolution: { width: 0, height: 0 },
      frameRate: 0,
      codec: validationResult.detectedCodec ?? 'unknown',
      metadata: null,
      thumbnailCandidates: [],
      lineage,
    });

    // 6. Save asset
    const savedAsset = await this.assetRepo.save(asset);

    // 7. Publish event
    await this.eventBus.publish(
      createDomainEvent(PIPELINE_EVENT_TYPES.AssetIngested, savedAsset.id, {
        assetId: savedAsset.id,
        channelId: savedAsset.channelId,
        sourceType: savedAsset.sourceType,
        fileSizeBytes: savedAsset.fileSizeBytes,
      }),
    );

    this.logger.info({ assetId: savedAsset.id }, 'Asset ingested successfully');

    return { asset: savedAsset, isDuplicate: false };
  }
}
