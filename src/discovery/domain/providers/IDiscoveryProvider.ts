export enum DiscoverySource {
  RSS = 'RSS',
  GOOGLE_TRENDS = 'GOOGLE_TRENDS',
  REDDIT = 'REDDIT',
  YOUTUBE = 'YOUTUBE',
  WHOP = 'WHOP',
}

export interface FetchParams {
  keywords?: string[];
  limit?: number;
  since?: Date;
}

export interface RawOpportunity {
  title: string;
  summary: string;
  url: string;
  publishedAt: Date | null;
  author?: string;
  metadata: Record<string, unknown>;
}

export interface IDiscoveryProvider {
  readonly name: string;
  readonly source: DiscoverySource;
  fetchOpportunities(params: FetchParams): Promise<RawOpportunity[]>;
  isConfigured(): boolean;
}
