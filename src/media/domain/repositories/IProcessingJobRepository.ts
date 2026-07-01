import type { ProcessingJob } from '../models/ProcessingJob';

export interface IProcessingJobRepository {
  save(job: ProcessingJob): Promise<ProcessingJob>;
  findById(id: string): Promise<ProcessingJob | null>;
  findByAssetId(assetId: string): Promise<ProcessingJob[]>;
  findRunningByChannelId(channelId: string): Promise<ProcessingJob[]>;
  findAll(): Promise<ProcessingJob[]>;
}
