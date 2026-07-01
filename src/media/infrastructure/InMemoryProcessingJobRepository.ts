import type { IProcessingJobRepository } from '../domain/repositories/IProcessingJobRepository';
import type { ProcessingJob } from '../domain/models/ProcessingJob';
import { JobStatus } from '../../core/queue/types';

export class InMemoryProcessingJobRepository implements IProcessingJobRepository {
  private readonly store = new Map<string, ProcessingJob>();

  async save(job: ProcessingJob): Promise<ProcessingJob> {
    this.store.set(job.id, job);
    return job;
  }

  async findById(id: string): Promise<ProcessingJob | null> {
    return this.store.get(id) ?? null;
  }

  async findByAssetId(assetId: string): Promise<ProcessingJob[]> {
    return Array.from(this.store.values()).filter(j => j.assetId === assetId);
  }

  async findRunningByChannelId(channelId: string): Promise<ProcessingJob[]> {
    return Array.from(this.store.values()).filter(
      j => j.channelId === channelId && j.status === JobStatus.Running,
    );
  }

  async findAll(): Promise<ProcessingJob[]> {
    return Array.from(this.store.values());
  }
}
