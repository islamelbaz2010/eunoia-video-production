import type { AssetSourceType } from './AssetSourceType';
import type { AssetTransformation } from './AssetTransformation';

export interface AssetLineageProps {
  assetId: string;
  sourceType: AssetSourceType;
  sourceReference: string;
  ingestedAt: Date;
  contentHash: string;
  transformations: AssetTransformation[];
}

export type CreateAssetLineageProps = Omit<AssetLineageProps, 'transformations'>;

export class AssetLineage {
  readonly assetId: string;
  readonly sourceType: AssetSourceType;
  readonly sourceReference: string;
  readonly ingestedAt: Date;
  readonly contentHash: string;
  readonly transformations: ReadonlyArray<AssetTransformation>;

  private constructor(props: AssetLineageProps) {
    this.assetId = props.assetId;
    this.sourceType = props.sourceType;
    this.sourceReference = props.sourceReference;
    this.ingestedAt = new Date(props.ingestedAt);
    this.contentHash = props.contentHash;
    this.transformations = Object.freeze([...props.transformations]);
  }

  static create(props: CreateAssetLineageProps): AssetLineage {
    return new AssetLineage({ ...props, transformations: [] });
  }

  static reconstitute(props: AssetLineageProps): AssetLineage {
    return new AssetLineage(props);
  }

  withTransformation(t: AssetTransformation): AssetLineage {
    return new AssetLineage({
      assetId: this.assetId,
      sourceType: this.sourceType,
      sourceReference: this.sourceReference,
      ingestedAt: new Date(this.ingestedAt),
      contentHash: this.contentHash,
      transformations: [...this.transformations, t],
    });
  }
}
