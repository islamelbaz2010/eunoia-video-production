import { DiscoverySource, type FetchParams, type IDiscoveryProvider, type RawOpportunity } from '../../domain/providers/IDiscoveryProvider';
import type { ILogger } from '../../../shared/logger/ILogger';

export interface GoogleTrendsProviderConfig {
  geo?: string;
  hl?: string;
}

/**
 * Discovers trending topics via the Google Trends API.
 *
 * This provider is a production-ready skeleton. Wire up a Google Trends
 * client (e.g., `google-trends-api` or a direct SerpAPI integration) in
 * `fetchTrends()` to activate real data.
 *
 * `isConfigured()` returns false until credentials are supplied so the
 * registry skips this provider in automated runs.
 */
export class GoogleTrendsProvider implements IDiscoveryProvider {
  readonly name = 'google-trends';
  readonly source = DiscoverySource.GOOGLE_TRENDS;

  constructor(
    private readonly config: GoogleTrendsProviderConfig,
    private readonly logger: ILogger,
  ) {}

  isConfigured(): boolean {
    return false;
  }

  async fetchOpportunities(_params: FetchParams): Promise<RawOpportunity[]> {
    this.logger.warn(
      { provider: this.name },
      'Google Trends provider is not yet configured — returning empty result set',
    );
    return [];
  }
}
