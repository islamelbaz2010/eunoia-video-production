import { DiscoverySource, type FetchParams, type IDiscoveryProvider, type RawOpportunity } from '../../domain/providers/IDiscoveryProvider';
import type { ILogger } from '../../../shared/logger/ILogger';

export interface WhopProviderConfig {
  apiKey?: string;
  categories?: string[];
}

/**
 * Discovers trending products and communities from the Whop marketplace.
 *
 * This provider is a production-ready skeleton. Implement `fetchListings()`
 * using the Whop API (`https://api.whop.com/v5/`) with the configured
 * `apiKey` to activate real data.
 *
 * `isConfigured()` returns false until an `apiKey` is supplied so the
 * registry skips this provider in automated runs.
 */
export class WhopProvider implements IDiscoveryProvider {
  readonly name = 'whop';
  readonly source = DiscoverySource.WHOP;

  constructor(
    private readonly config: WhopProviderConfig,
    private readonly logger: ILogger,
  ) {}

  isConfigured(): boolean {
    return typeof this.config.apiKey === 'string' && this.config.apiKey.length > 0;
  }

  async fetchOpportunities(_params: FetchParams): Promise<RawOpportunity[]> {
    this.logger.warn(
      { provider: this.name },
      'Whop provider API key is not configured — returning empty result set',
    );
    return [];
  }
}
