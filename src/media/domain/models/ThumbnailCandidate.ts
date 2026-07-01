import { randomUUID } from 'crypto';

export interface ThumbnailCandidateProps {
  frameId: string;
  videoAssetId: string;
  timestampSeconds: number;
  storageKey: string;
  visualQualityScore: number;
  narrativeRelevanceScore: number;
  aestheticConsistencyScore: number;
  compositeScore: number;
  isRecommended: boolean;
}

export type CreateThumbnailCandidateProps = Omit<ThumbnailCandidateProps, 'frameId'>;

export class ThumbnailCandidate {
  readonly frameId: string;
  readonly videoAssetId: string;
  readonly timestampSeconds: number;
  readonly storageKey: string;
  readonly visualQualityScore: number;
  readonly narrativeRelevanceScore: number;
  readonly aestheticConsistencyScore: number;
  readonly compositeScore: number;
  readonly isRecommended: boolean;

  private constructor(props: ThumbnailCandidateProps) {
    this.frameId = props.frameId;
    this.videoAssetId = props.videoAssetId;
    this.timestampSeconds = props.timestampSeconds;
    this.storageKey = props.storageKey;
    this.visualQualityScore = props.visualQualityScore;
    this.narrativeRelevanceScore = props.narrativeRelevanceScore;
    this.aestheticConsistencyScore = props.aestheticConsistencyScore;
    this.compositeScore = props.compositeScore;
    this.isRecommended = props.isRecommended;
  }

  static create(props: CreateThumbnailCandidateProps): ThumbnailCandidate {
    return new ThumbnailCandidate({ ...props, frameId: randomUUID() });
  }

  static reconstitute(props: ThumbnailCandidateProps): ThumbnailCandidate {
    return new ThumbnailCandidate(props);
  }
}
