import type { DomainEvent } from '../../core/events/DomainEvent';
import type { AssetSourceType } from '../domain/models/AssetSourceType';
import type { ProcessingJobType } from '../domain/models/ProcessingJobType';

export const PIPELINE_EVENT_TYPES = {
  AssetIngested: 'pipeline.asset.ingested',
  DuplicateDetected: 'pipeline.asset.duplicate_detected',
  ValidationFailed: 'pipeline.validation.failed',
  ProcessingStarted: 'pipeline.processing.started',
  ProcessingCompleted: 'pipeline.processing.completed',
  ProcessingFailed: 'pipeline.processing.failed',
  MetadataReady: 'pipeline.metadata.ready',
  ThumbnailReady: 'pipeline.thumbnail.ready',
  MetadataAccepted: 'pipeline.metadata.accepted',
} as const;

export type PipelineEventType = (typeof PIPELINE_EVENT_TYPES)[keyof typeof PIPELINE_EVENT_TYPES];

// Payloads

export interface AssetIngestedPayload {
  assetId: string;
  channelId: string;
  sourceType: AssetSourceType;
  fileSizeBytes: number;
}

export interface DuplicateDetectedPayload {
  newSourceReference: string;
  existingAssetId: string;
}

export interface ValidationFailedPayload {
  assetId: string;
  reason: string;
  code: string;
}

export interface ProcessingStartedPayload {
  jobId: string;
  assetId: string;
  jobType: ProcessingJobType;
}

export interface ProcessingCompletedPayload {
  jobId: string;
  assetId: string;
  jobType: ProcessingJobType;
  durationMs: number;
}

export interface ProcessingFailedPayload {
  jobId: string;
  assetId: string;
  lastError: string;
  attempts: number;
}

export interface MetadataReadyPayload {
  assetId: string;
  extractionId: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface ThumbnailReadyPayload {
  assetId: string;
  selectionId: string;
  candidateCount: number;
}

export interface MetadataAcceptedPayload {
  assetId: string;
  acceptedTitle: string;
}

// Typed event interfaces

export interface AssetIngested extends DomainEvent {
  readonly eventType: typeof PIPELINE_EVENT_TYPES.AssetIngested;
  readonly payload: AssetIngestedPayload;
}

export interface DuplicateDetected extends DomainEvent {
  readonly eventType: typeof PIPELINE_EVENT_TYPES.DuplicateDetected;
  readonly payload: DuplicateDetectedPayload;
}

export interface ValidationFailed extends DomainEvent {
  readonly eventType: typeof PIPELINE_EVENT_TYPES.ValidationFailed;
  readonly payload: ValidationFailedPayload;
}

export interface ProcessingStarted extends DomainEvent {
  readonly eventType: typeof PIPELINE_EVENT_TYPES.ProcessingStarted;
  readonly payload: ProcessingStartedPayload;
}

export interface ProcessingCompleted extends DomainEvent {
  readonly eventType: typeof PIPELINE_EVENT_TYPES.ProcessingCompleted;
  readonly payload: ProcessingCompletedPayload;
}

export interface ProcessingFailed extends DomainEvent {
  readonly eventType: typeof PIPELINE_EVENT_TYPES.ProcessingFailed;
  readonly payload: ProcessingFailedPayload;
}

export interface MetadataReady extends DomainEvent {
  readonly eventType: typeof PIPELINE_EVENT_TYPES.MetadataReady;
  readonly payload: MetadataReadyPayload;
}

export interface ThumbnailReady extends DomainEvent {
  readonly eventType: typeof PIPELINE_EVENT_TYPES.ThumbnailReady;
  readonly payload: ThumbnailReadyPayload;
}

export interface MetadataAccepted extends DomainEvent {
  readonly eventType: typeof PIPELINE_EVENT_TYPES.MetadataAccepted;
  readonly payload: MetadataAcceptedPayload;
}
