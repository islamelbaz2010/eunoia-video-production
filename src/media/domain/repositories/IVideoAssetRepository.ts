import type { VideoAsset } from '../models/VideoAsset';
import type { AssetStatus } from '../models/AssetStatus';

export interface VideoAssetFilter {
  channelId?: string;
  status?: AssetStatus;
}

export interface IVideoAssetRepository {
  save(asset: VideoAsset): Promise<VideoAsset>;
  findById(id: string): Promise<VideoAsset | null>;
  findByContentHash(hash: string): Promise<VideoAsset | null>;
  findAll(filter?: VideoAssetFilter): Promise<VideoAsset[]>;
  delete(id: string): Promise<void>;
}
