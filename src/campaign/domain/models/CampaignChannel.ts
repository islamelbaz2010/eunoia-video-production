export interface CampaignChannelProps {
  name: string;
  platform: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

export class CampaignChannel {
  readonly name: string;
  readonly platform: string;
  readonly enabled: boolean;
  readonly config: Readonly<Record<string, unknown>>;

  private constructor(props: CampaignChannelProps) {
    this.name = props.name;
    this.platform = props.platform;
    this.enabled = props.enabled;
    this.config = Object.freeze({ ...props.config });
  }

  static create(props: CampaignChannelProps): CampaignChannel {
    return new CampaignChannel(props);
  }

  withEnabled(enabled: boolean): CampaignChannel {
    return CampaignChannel.create({
      name: this.name,
      platform: this.platform,
      enabled,
      config: { ...this.config },
    });
  }

  withConfig(config: Record<string, unknown>): CampaignChannel {
    return CampaignChannel.create({
      name: this.name,
      platform: this.platform,
      enabled: this.enabled,
      config,
    });
  }
}
