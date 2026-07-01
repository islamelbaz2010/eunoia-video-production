import { randomUUID } from 'crypto';
import { AssetStatus } from './AssetStatus';
import type { AssetSourceType } from './AssetSourceType';
import type { VideoResolution } from './VideoResolution';
import { meetsMinimumResolution } from './VideoResolution';
import type { VideoMetadataDraft } from './VideoMetadataDraft';
import type { ThumbnailCandidate } from './ThumbnailCandidate';
import type { AssetLineage } from './AssetLineage';
import type { QualityWarning } from './QualityWarning';

export interface VideoAssetProps {
  id: string;
  channelId: string;
  sourceType: AssetSourceType;
  sourceReference: string;
  contentHash: string;
  filename: string;
  fileSizeBytes: number;
  durationSeconds: number;
  resolution: VideoResolution;
  frameRate: number;
  codec: string;
  status: AssetStatus;
  metadata: VideoMetadataDraft | null;
  thumbnailCandidates: ThumbnailCandidate[];
  lineage: AssetLineage;
  qualityWarnings: QualityWarning[];
  ingestedAt: Date;
  processedAt: Date | null;
}

export type CreateVideoAssetProps = Omit<
  VideoAssetProps,
  'id' | 'status' | 'ingestedAt' | 'processedAt' | 'qualityWarnings'
>;

export class VideoAsset {
  readonly id: string;
  readonly channelId: string;
  readonly sourceType: AssetSourceType;
  readonly sourceReference: string;
  readonly contentHash: string;
  readonly filename: string;
  readonly fileSizeBytes: number;
  readonly durationSeconds: number;
  readonly resolution: VideoResolution;
  readonly frameRate: number;
  readonly codec: string;
  readonly status: AssetStatus;
  readonly metadata: VideoMetadataDraft | null;
  readonly thumbnailCandidates: ReadonlyArray<ThumbnailCandidate>;
  readonly lineage: AssetLineage;
  readonly qualityWarnings: ReadonlyArray<QualityWarning>;
  readonly ingestedAt: Date;
  readonly processedAt: Date | null;

  private constructor(props: VideoAssetProps) {
    this.id = props.id;
    this.channelId = props.channelId;
    this.sourceType = props.sourceType;
    this.sourceReference = props.sourceReference;
    this.contentHash = props.contentHash;
    this.filename = props.filename;
    this.fileSizeBytes = props.fileSizeBytes;
    this.durationSeconds = props.durationSeconds;
    this.resolution = props.resolution;
    this.frameRate = props.frameRate;
    this.codec = props.codec;
    this.status = props.status;
    this.metadata = props.metadata;
    this.thumbnailCandidates = Object.freeze([...props.thumbnailCandidates]);
    this.lineage = props.lineage;
    this.qualityWarnings = Object.freeze([...props.qualityWarnings]);
    this.ingestedAt = new Date(props.ingestedAt);
    this.processedAt = props.processedAt !== null ? new Date(props.processedAt) : null;
  }

  static create(props: CreateVideoAssetProps): VideoAsset {
    return new VideoAsset({
      ...props,
      id: randomUUID(),
      status: AssetStatus.Ingested,
      ingestedAt: new Date(),
      processedAt: null,
      qualityWarnings: [],
    });
  }

  static reconstitute(props: VideoAssetProps): VideoAsset {
    return new VideoAsset(props);
  }

  private toProps(): VideoAssetProps {
    return {
      id: this.id,
      channelId: this.channelId,
      sourceType: this.sourceType,
      sourceReference: this.sourceReference,
      contentHash: this.contentHash,
      filename: this.filename,
      fileSizeBytes: this.fileSizeBytes,
      durationSeconds: this.durationSeconds,
      resolution: this.resolution,
      frameRate: this.frameRate,
      codec: this.codec,
      status: this.status,
      metadata: this.metadata,
      thumbnailCandidates: [...this.thumbnailCandidates],
      lineage: this.lineage,
      qualityWarnings: [...this.qualityWarnings],
      ingestedAt: new Date(this.ingestedAt),
      processedAt: this.processedAt !== null ? new Date(this.processedAt) : null,
    };
  }

  withStatus(status: AssetStatus): VideoAsset {
    return VideoAsset.reconstitute({ ...this.toProps(), status });
  }

  withMetadata(metadata: VideoMetadataDraft): VideoAsset {
    return VideoAsset.reconstitute({ ...this.toProps(), metadata });
  }

  withThumbnailCandidates(candidates: ThumbnailCandidate[]): VideoAsset {
    return VideoAsset.reconstitute({ ...this.toProps(), thumbnailCandidates: [...candidates] });
  }

  withQualityWarning(w: QualityWarning): VideoAsset {
    return VideoAsset.reconstitute({
      ...this.toProps(),
      qualityWarnings: [...this.qualityWarnings, w],
    });
  }

  withLineage(lineage: AssetLineage): VideoAsset {
    return VideoAsset.reconstitute({ ...this.toProps(), lineage });
  }

  withProcessedAt(date: Date): VideoAsset {
    return VideoAsset.reconstitute({ ...this.toProps(), processedAt: new Date(date) });
  }

  meetsMinimumQuality(): boolean {
    return meetsMinimumResolution(this.resolution) && this.frameRate >= 24;
  }

  isReadyForPublishing(): boolean {
    return this.status === AssetStatus.Ready && this.metadata?.isAccepted() === true;
  }
}
