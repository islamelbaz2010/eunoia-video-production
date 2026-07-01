import type { ILogger } from '../../shared/logger/ILogger';
import type { MediaIngestionService } from '../application/MediaIngestionService';
import type { MediaProcessingService } from '../application/MediaProcessingService';
import type { IAIMetadataExtractor } from '../adapters/IAIMetadataExtractor';
import type { IThumbnailExtractor } from '../adapters/IThumbnailExtractor';
import type { AssetSourceType } from '../domain/models/AssetSourceType';
import type { VideoAsset } from '../domain/models/VideoAsset';
import type { ProcessingJob } from '../domain/models/ProcessingJob';

export interface IngestionPipelineInput {
  channelId: string;
  sourceType: AssetSourceType;
  sourceReference: string;
  filename: string;
  fileSizeBytes: number;
  mimeType: string;
  workingTitle?: string;
  notes?: string;
}

export interface IngestionPipelineResult {
  asset: VideoAsset;
  jobs: ProcessingJob[];
  isDuplicate: boolean;
}

export class IngestionPipeline {
  private readonly logger: ILogger;

  constructor(
    private readonly ingestionService: MediaIngestionService,
    private readonly processingService: MediaProcessingService,
    private readonly metadataExtractor: IAIMetadataExtractor,
    private readonly thumbnailExtractor: IThumbnailExtractor,
    logger: ILogger,
  ) {
    this.logger = logger.child({ service: 'IngestionPipeline' });
  }

  async run(input: IngestionPipelineInput): Promise<IngestionPipelineResult> {
    this.logger.info({ channelId: input.channelId, filename: input.filename }, 'Running ingestion pipeline');

    const { asset, isDuplicate } = await this.ingestionService.ingest(input);

    if (isDuplicate) {
      this.logger.info({ assetId: asset.id }, 'Duplicate detected; skipping job enqueueing');
      return { asset, jobs: [], isDuplicate: true };
    }

    const jobs = await this.processingService.enqueueProcessingJobs(asset.id, input.channelId);

    this.logger.info(
      { assetId: asset.id, jobCount: jobs.length },
      'Ingestion pipeline completed',
    );

    return { asset, jobs, isDuplicate: false };
  }
}
