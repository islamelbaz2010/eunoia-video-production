import { DiscoverySource, type FetchParams, type IDiscoveryProvider, type RawOpportunity } from '../../domain/providers/IDiscoveryProvider';
import type { ILogger } from '../../../shared/logger/ILogger';

export interface RedditProviderConfig {
  clientId?: string;
  clientSecret?: string;
  userAgent?: string;
  subreddits?: string[];
}

/**
 * Discovers opportunities from Reddit via the OAuth2 Reddit API.
 *
 * This provider is a production-ready skeleton. Implement `fetchPosts()`
 * using the Reddit REST API (`https://oauth.reddit.com/r/{sub}/hot`) with
 * the configured credentials to activate real data.
 *
 * `isConfigured()` returns false until `clientId` and `clientSecret` are
 * supplied so the registry skips this provider in automated runs.
 */
export class RedditProvider implements IDiscoveryProvider {
  readonly name = 'reddit';
  readonly source = DiscoverySource.REDDIT;

  constructor(
    private readonly config: RedditProviderConfig,
    private readonly logger: ILogger,
  ) {}

  isConfigured(): boolean {
    return (
      typeof this.config.clientId === 'string' &&
      this.config.clientId.length > 0 &&
      typeof this.config.clientSecret === 'string' &&
      this.config.clientSecret.length > 0
    );
  }

  async fetchOpportunities(_params: FetchParams): Promise<RawOpportunity[]> {
    this.logger.warn(
      { provider: this.name },
      'Reddit provider credentials are not configured — returning empty result set',
    );
    return [];
  }
}
