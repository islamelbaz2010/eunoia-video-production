// Domain Models
export { AssetSourceType } from './domain/models/AssetSourceType';
export { AssetStatus } from './domain/models/AssetStatus';
export { ProcessingJobType } from './domain/models/ProcessingJobType';
export type { VideoResolution } from './domain/models/VideoResolution';
export { meetsMinimumResolution } from './domain/models/VideoResolution';
export type { QualityWarningCode, QualityWarning } from './domain/models/QualityWarning';
export type { AssetTransformation } from './domain/models/AssetTransformation';
export { AssetLineage } from './domain/models/AssetLineage';
export type { AssetLineageProps, CreateAssetLineageProps } from './domain/models/AssetLineage';
export type { TitleCandidate } from './domain/models/TitleCandidate';
export type { Chapter } from './domain/models/Chapter';
export { ThumbnailCandidate } from './domain/models/ThumbnailCandidate';
export type { ThumbnailCandidateProps, CreateThumbnailCandidateProps } from './domain/models/ThumbnailCandidate';
export { VideoMetadataDraft } from './domain/models/VideoMetadataDraft';
export type { VideoMetadataDraftProps, CreateVideoMetadataDraftProps } from './domain/models/VideoMetadataDraft';
export { ProcessingJob } from './domain/models/ProcessingJob';
export type { ProcessingJobProps, CreateProcessingJobProps } from './domain/models/ProcessingJob';
export { VideoAsset } from './domain/models/VideoAsset';
export type { VideoAssetProps, CreateVideoAssetProps } from './domain/models/VideoAsset';

// Domain Repositories
export type { IVideoAssetRepository, VideoAssetFilter } from './domain/repositories/IVideoAssetRepository';
export type { IProcessingJobRepository } from './domain/repositories/IProcessingJobRepository';

// Adapter Interfaces
export type { IMediaValidator, ValidationResult } from './adapters/IMediaValidator';
export type { IAIMetadataExtractor, MetadataExtractionInput, MetadataExtractionResult } from './adapters/IAIMetadataExtractor';
export type { IThumbnailExtractor, ThumbnailExtractionInput, ThumbnailExtractionResult } from './adapters/IThumbnailExtractor';

// Mock Adapters
export { MockMediaValidator } from './adapters/mock/MockMediaValidator';
export { MockAIMetadataExtractor } from './adapters/mock/MockAIMetadataExtractor';
export { MockThumbnailExtractor } from './adapters/mock/MockThumbnailExtractor';

// Events
export { PIPELINE_EVENT_TYPES } from './events/PipelineEvents';
export type {
  PipelineEventType,
  AssetIngestedPayload,
  DuplicateDetectedPayload,
  ValidationFailedPayload,
  ProcessingStartedPayload,
  ProcessingCompletedPayload,
  ProcessingFailedPayload,
  MetadataReadyPayload,
  ThumbnailReadyPayload,
  MetadataAcceptedPayload,
  AssetIngested,
  DuplicateDetected,
  ValidationFailed,
  ProcessingStarted,
  ProcessingCompleted,
  ProcessingFailed,
  MetadataReady,
  ThumbnailReady,
  MetadataAccepted,
} from './events/PipelineEvents';

// Application Services
export { MediaIngestionService } from './application/MediaIngestionService';
export type { IngestInput, IngestResult } from './application/MediaIngestionService';
export { MediaProcessingService } from './application/MediaProcessingService';
export { MetadataAcceptanceService } from './application/MetadataAcceptanceService';
export type { MetadataAcceptanceInput } from './application/MetadataAcceptanceService';

// Workflow
export { IngestionPipeline } from './workflow/IngestionPipeline';
export type { IngestionPipelineInput, IngestionPipelineResult } from './workflow/IngestionPipeline';

// Infrastructure
export { InMemoryVideoAssetRepository } from './infrastructure/InMemoryVideoAssetRepository';
export { InMemoryProcessingJobRepository } from './infrastructure/InMemoryProcessingJobRepository';
