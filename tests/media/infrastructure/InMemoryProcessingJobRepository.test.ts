import { InMemoryProcessingJobRepository } from '../../../src/media/infrastructure/InMemoryProcessingJobRepository';
import { ProcessingJob } from '../../../src/media/domain/models/ProcessingJob';
import { ProcessingJobType } from '../../../src/media/domain/models/ProcessingJobType';
import { JobStatus } from '../../../src/core/queue/types';

function makeJob(overrides: {
  assetId?: string;
  channelId?: string;
  type?: ProcessingJobType;
} = {}): ProcessingJob {
  return ProcessingJob.create({
    assetId: overrides.assetId ?? 'asset-1',
    channelId: overrides.channelId ?? 'channel-1',
    type: overrides.type ?? ProcessingJobType.Validation,
  });
}

describe('InMemoryProcessingJobRepository', () => {
  describe('save', () => {
    it('stores and returns the job', async () => {
      const repo = new InMemoryProcessingJobRepository();
      const job = makeJob();
      const saved = await repo.save(job);
      expect(saved).toBe(job);
    });

    it('overwrites existing job on re-save', async () => {
      const repo = new InMemoryProcessingJobRepository();
      const job = makeJob();
      await repo.save(job);
      const updated = job.withStarted();
      await repo.save(updated);
      const found = await repo.findById(job.id);
      expect(found?.status).toBe(JobStatus.Running);
    });
  });

  describe('findById', () => {
    it('returns job by id', async () => {
      const repo = new InMemoryProcessingJobRepository();
      const job = makeJob();
      await repo.save(job);
      const found = await repo.findById(job.id);
      expect(found?.id).toBe(job.id);
    });

    it('returns null for unknown id', async () => {
      const repo = new InMemoryProcessingJobRepository();
      const found = await repo.findById('non-existent');
      expect(found).toBeNull();
    });
  });

  describe('findByAssetId', () => {
    it('returns all jobs for a given assetId', async () => {
      const repo = new InMemoryProcessingJobRepository();
      const j1 = makeJob({ assetId: 'asset-A', type: ProcessingJobType.Validation });
      const j2 = makeJob({ assetId: 'asset-A', type: ProcessingJobType.MetadataExtraction });
      const j3 = makeJob({ assetId: 'asset-B', type: ProcessingJobType.ThumbnailExtraction });
      await repo.save(j1);
      await repo.save(j2);
      await repo.save(j3);

      const result = await repo.findByAssetId('asset-A');
      expect(result).toHaveLength(2);
      result.forEach(j => expect(j.assetId).toBe('asset-A'));
    });

    it('returns empty array for unknown assetId', async () => {
      const repo = new InMemoryProcessingJobRepository();
      const result = await repo.findByAssetId('non-existent');
      expect(result).toHaveLength(0);
    });
  });

  describe('findRunningByChannelId', () => {
    it('returns only running jobs for the channel', async () => {
      const repo = new InMemoryProcessingJobRepository();

      const pending = makeJob({ channelId: 'channel-1' });
      const running = makeJob({ channelId: 'channel-1', type: ProcessingJobType.MetadataExtraction }).withStarted();
      const otherChannel = makeJob({ channelId: 'channel-2', type: ProcessingJobType.ThumbnailExtraction }).withStarted();

      await repo.save(pending);
      await repo.save(running);
      await repo.save(otherChannel);

      const result = await repo.findRunningByChannelId('channel-1');
      expect(result).toHaveLength(1);
      expect(result[0]?.status).toBe(JobStatus.Running);
      expect(result[0]?.channelId).toBe('channel-1');
    });

    it('returns empty array when no running jobs for channel', async () => {
      const repo = new InMemoryProcessingJobRepository();
      const result = await repo.findRunningByChannelId('channel-1');
      expect(result).toHaveLength(0);
    });
  });

  describe('findAll', () => {
    it('returns all stored jobs', async () => {
      const repo = new InMemoryProcessingJobRepository();
      await repo.save(makeJob({ assetId: 'a1' }));
      await repo.save(makeJob({ assetId: 'a2', type: ProcessingJobType.MetadataExtraction }));
      const all = await repo.findAll();
      expect(all).toHaveLength(2);
    });

    it('returns empty array when no jobs', async () => {
      const repo = new InMemoryProcessingJobRepository();
      const all = await repo.findAll();
      expect(all).toHaveLength(0);
    });
  });
});
