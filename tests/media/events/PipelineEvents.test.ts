import { PIPELINE_EVENT_TYPES } from '../../../src/media/events/PipelineEvents';
import { createDomainEvent } from '../../../src/core/events/DomainEvent';
import { AssetSourceType } from '../../../src/media/domain/models/AssetSourceType';
import { ProcessingJobType } from '../../../src/media/domain/models/ProcessingJobType';

describe('PipelineEvents', () => {
  describe('PIPELINE_EVENT_TYPES constants', () => {
    it('AssetIngested has correct literal value', () => {
      expect(PIPELINE_EVENT_TYPES.AssetIngested).toBe('pipeline.asset.ingested');
    });

    it('DuplicateDetected has correct literal value', () => {
      expect(PIPELINE_EVENT_TYPES.DuplicateDetected).toBe('pipeline.asset.duplicate_detected');
    });

    it('ValidationFailed has correct literal value', () => {
      expect(PIPELINE_EVENT_TYPES.ValidationFailed).toBe('pipeline.validation.failed');
    });

    it('ProcessingStarted has correct literal value', () => {
      expect(PIPELINE_EVENT_TYPES.ProcessingStarted).toBe('pipeline.processing.started');
    });

    it('ProcessingCompleted has correct literal value', () => {
      expect(PIPELINE_EVENT_TYPES.ProcessingCompleted).toBe('pipeline.processing.completed');
    });

    it('ProcessingFailed has correct literal value', () => {
      expect(PIPELINE_EVENT_TYPES.ProcessingFailed).toBe('pipeline.processing.failed');
    });

    it('MetadataReady has correct literal value', () => {
      expect(PIPELINE_EVENT_TYPES.MetadataReady).toBe('pipeline.metadata.ready');
    });

    it('ThumbnailReady has correct literal value', () => {
      expect(PIPELINE_EVENT_TYPES.ThumbnailReady).toBe('pipeline.thumbnail.ready');
    });

    it('MetadataAccepted has correct literal value', () => {
      expect(PIPELINE_EVENT_TYPES.MetadataAccepted).toBe('pipeline.metadata.accepted');
    });
  });

  describe('createDomainEvent helper with pipeline event types', () => {
    it('creates AssetIngested event with correct structure', () => {
      const payload = {
        assetId: 'asset-1',
        channelId: 'channel-1',
        sourceType: AssetSourceType.DirectUpload,
        fileSizeBytes: 1024,
      };
      const event = createDomainEvent(PIPELINE_EVENT_TYPES.AssetIngested, 'asset-1', payload);
      expect(event.eventType).toBe('pipeline.asset.ingested');
      expect(event.aggregateId).toBe('asset-1');
      expect(event.eventId).toBeDefined();
      expect(event.occurredAt).toBeInstanceOf(Date);
      expect(event.payload).toEqual(payload);
    });

    it('creates DuplicateDetected event with correct structure', () => {
      const payload = { newSourceReference: 'ref', existingAssetId: 'existing-1' };
      const event = createDomainEvent(PIPELINE_EVENT_TYPES.DuplicateDetected, 'existing-1', payload);
      expect(event.eventType).toBe('pipeline.asset.duplicate_detected');
    });

    it('creates ProcessingStarted event', () => {
      const payload = { jobId: 'job-1', assetId: 'asset-1', jobType: ProcessingJobType.Validation };
      const event = createDomainEvent(PIPELINE_EVENT_TYPES.ProcessingStarted, 'asset-1', payload);
      expect(event.eventType).toBe('pipeline.processing.started');
    });

    it('creates ProcessingCompleted event', () => {
      const payload = { jobId: 'job-1', assetId: 'asset-1', jobType: ProcessingJobType.Validation, durationMs: 500 };
      const event = createDomainEvent(PIPELINE_EVENT_TYPES.ProcessingCompleted, 'asset-1', payload);
      expect(event.eventType).toBe('pipeline.processing.completed');
    });

    it('creates MetadataReady event', () => {
      const payload = { assetId: 'asset-1', extractionId: 'ext-1', confidence: 'high' as const };
      const event = createDomainEvent(PIPELINE_EVENT_TYPES.MetadataReady, 'asset-1', payload);
      expect(event.eventType).toBe('pipeline.metadata.ready');
    });

    it('creates ThumbnailReady event', () => {
      const payload = { assetId: 'asset-1', selectionId: 'sel-1', candidateCount: 5 };
      const event = createDomainEvent(PIPELINE_EVENT_TYPES.ThumbnailReady, 'asset-1', payload);
      expect(event.eventType).toBe('pipeline.thumbnail.ready');
    });

    it('creates MetadataAccepted event', () => {
      const payload = { assetId: 'asset-1', acceptedTitle: 'My Title' };
      const event = createDomainEvent(PIPELINE_EVENT_TYPES.MetadataAccepted, 'asset-1', payload);
      expect(event.eventType).toBe('pipeline.metadata.accepted');
    });
  });
});
