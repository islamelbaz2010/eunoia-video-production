import { AppError, NotFoundError } from '../../shared/errors/AppError';
import type { ILogger } from '../../shared/logger/ILogger';
import type { IEventBus } from '../../core/events/IEventBus';
import { createDomainEvent } from '../../core/events/DomainEvent';
import type { IVideoAssetRepository } from '../domain/repositories/IVideoAssetRepository';
import { AssetStatus } from '../domain/models/AssetStatus';
import type { VideoAsset } from '../domain/models/VideoAsset';
import type { Chapter } from '../domain/models/Chapter';
import { PIPELINE_EVENT_TYPES } from '../events/PipelineEvents';

export interface MetadataAcceptanceInput {
  title: string;
  description: string;
  tags: string[];
  chapters: Chapter[];
}

export class MetadataAcceptanceService {
  private readonly logger: ILogger;

  constructor(
    private readonly assetRepo: IVideoAssetRepository,
    private readonly eventBus: IEventBus,
    logger: ILogger,
  ) {
    this.logger = logger.child({ service: 'MetadataAcceptanceService' });
  }

  async acceptMetadata(assetId: string, acceptance: MetadataAcceptanceInput): Promise<VideoAsset> {
    this.logger.info({ assetId }, 'Accepting metadata for asset');

    const asset = await this.assetRepo.findById(assetId);
    if (asset === null) {
      throw new NotFoundError('VideoAsset', assetId);
    }

    if (asset.metadata === null) {
      throw new AppError(
        `Asset '${assetId}' has no metadata draft to accept.`,
        'NO_METADATA_DRAFT',
      );
    }

    if (asset.metadata.isAccepted()) {
      throw new AppError(
        `Metadata for asset '${assetId}' has already been accepted.`,
        'METADATA_ALREADY_ACCEPTED',
      );
    }

    const acceptedDraft = asset.metadata.withAcceptance(
      acceptance.title,
      acceptance.description,
      acceptance.tags,
      acceptance.chapters,
    );

    let updatedAsset = asset.withMetadata(acceptedDraft);
    updatedAsset = updatedAsset.withStatus(AssetStatus.Ready);

    const savedAsset = await this.assetRepo.save(updatedAsset);

    await this.eventBus.publish(
      createDomainEvent(PIPELINE_EVENT_TYPES.MetadataAccepted, assetId, {
        assetId,
        acceptedTitle: acceptance.title,
      }),
    );

    this.logger.info({ assetId, acceptedTitle: acceptance.title }, 'Metadata accepted');

    return savedAsset;
  }
}
