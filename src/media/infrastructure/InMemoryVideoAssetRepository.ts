import type { IVideoAssetRepository, VideoAssetFilter } from '../domain/repositories/IVideoAssetRepository';
import type { VideoAsset } from '../domain/models/VideoAsset';

export class InMemoryVideoAssetRepository implements IVideoAssetRepository {
  private readonly store = new Map<string, VideoAsset>();

  async save(asset: VideoAsset): Promise<VideoAsset> {
    this.store.set(asset.id, asset);
    return asset;
  }

  async findById(id: string): Promise<VideoAsset | null> {
    return this.store.get(id) ?? null;
  }

  async findByContentHash(hash: string): Promise<VideoAsset | null> {
    for (const asset of this.store.values()) {
      if (asset.contentHash === hash) {
        return asset;
      }
    }
    return null;
  }

  async findAll(filter?: VideoAssetFilter): Promise<VideoAsset[]> {
    let assets = Array.from(this.store.values());

    if (filter?.channelId !== undefined) {
      assets = assets.filter(a => a.channelId === filter.channelId);
    }

    if (filter?.status !== undefined) {
      assets = assets.filter(a => a.status === filter.status);
    }

    return assets;
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }
}
