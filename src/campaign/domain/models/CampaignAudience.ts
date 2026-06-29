export interface AgeRange {
  min: number;
  max: number;
}

export interface CampaignAudienceProps {
  segments: string[];
  demographics: Record<string, unknown>;
  estimatedSize: number;
  targetAge: AgeRange | null;
}

export class CampaignAudience {
  readonly segments: ReadonlyArray<string>;
  readonly demographics: Readonly<Record<string, unknown>>;
  readonly estimatedSize: number;
  readonly targetAge: Readonly<AgeRange> | null;

  private constructor(props: CampaignAudienceProps) {
    this.segments = Object.freeze([...props.segments]);
    this.demographics = Object.freeze({ ...props.demographics });
    this.estimatedSize = props.estimatedSize;
    this.targetAge = props.targetAge !== null ? Object.freeze({ ...props.targetAge }) : null;
  }

  static create(props: CampaignAudienceProps): CampaignAudience {
    return new CampaignAudience(props);
  }

  static empty(): CampaignAudience {
    return new CampaignAudience({
      segments: [],
      demographics: {},
      estimatedSize: 0,
      targetAge: null,
    });
  }
}
