import { DiscoverySource, type FetchParams, type IDiscoveryProvider, type RawOpportunity } from '../../domain/providers/IDiscoveryProvider';
import type { ILogger } from '../../../shared/logger/ILogger';

export interface YouTubeProviderConfig {
  apiKey?: string;
  regionCode?: string;
  relevanceLanguage?: string;
}

/**
 * Discovers opportunities via the YouTube Data API v3.
 *
 * This provider is a production-ready skeleton. Implement `searchVideos()`
 * calling `GET https://www.googleapis.com/youtube/v3/search` with the
 * configured `apiKey` to activate real data.
 *
 * `isConfigured()` returns false until an `apiKey` is supplied so the
 * registry skips this provider in automated runs.
 */
export class YouTubeProvider implements IDiscoveryProvider {
  readonly name = 'youtube';
  readonly source = DiscoverySource.YOUTUBE;

  constructor(
    private readonly config: YouTubeProviderConfig,
    private readonly logger: ILogger,
  ) {}

  isConfigured(): boolean {
    return typeof this.config.apiKey === 'string' && this.config.apiKey.length > 0;
  }

  async fetchOpportunities(_params: FetchParams): Promise<RawOpportunity[]> {
    this.logger.warn(
      { provider: this.name },
      'YouTube provider API key is not configured — returning empty result set',
    );
    return [];
  }
}
