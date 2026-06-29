export enum MarketplaceCategory {
  AIIntegration = 'ai_integration',
  Storage = 'storage',
  Analytics = 'analytics',
  Publishing = 'publishing',
  Communication = 'communication',
  Automation = 'automation',
  Security = 'security',
  Utility = 'utility',
}

export enum MarketplaceLicense {
  MIT = 'mit',
  Apache2 = 'apache_2',
  GPL3 = 'gpl_3',
  Commercial = 'commercial',
  Proprietary = 'proprietary',
}

export interface MarketplacePublisher {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly verified: boolean;
  readonly website: string | null;
}

export interface MarketplaceVersion {
  readonly version: string;
  readonly releaseDate: Date;
  readonly changelog: string;
  readonly minEngineVersion: string;
  readonly downloadUrl: string;
  readonly checksum: string;
}

export interface MarketplacePlugin {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: MarketplaceCategory;
  readonly license: MarketplaceLicense;
  readonly publisher: MarketplacePublisher;
  readonly versions: ReadonlyArray<MarketplaceVersion>;
  readonly tags: ReadonlyArray<string>;
  readonly downloads: number;
  readonly rating: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export type MarketplaceSourceType = 'official' | 'community' | 'private';

export interface MarketplaceSource {
  readonly name: string;
  readonly url: string;
  readonly type: MarketplaceSourceType;
  readonly trusted: boolean;
}
