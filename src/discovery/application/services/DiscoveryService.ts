import { Opportunity, OpportunityStatus } from '../../domain/models/Opportunity';
import type { FetchParams, IDiscoveryProvider } from '../../domain/providers/IDiscoveryProvider';
import type { IOpportunityRepository, OpportunityFilter } from '../../domain/repositories/IOpportunityRepository';
import type { IProviderRegistry } from '../../domain/registry/IProviderRegistry';
import type { IOpportunityScoringService } from '../scoring/IOpportunityScoringService';
import type { ILogger } from '../../../shared/logger/ILogger';

export interface DiscoverParams extends FetchParams {
  providerNames?: string[];
}

export class DiscoveryService {
  constructor(
    private readonly registry: IProviderRegistry,
    private readonly repository: IOpportunityRepository,
    private readonly scoringService: IOpportunityScoringService,
    private readonly logger: ILogger,
  ) {}

  async discover(params: DiscoverParams): Promise<Opportunity[]> {
    const providers = this.resolveProviders(params);
    const fetchParams = buildFetchParams(params);

    this.logger.info(
      { providerCount: providers.length, keywords: params.keywords },
      'Starting discovery run',
    );

    const opportunities: Opportunity[] = [];

    for (const provider of providers) {
      const providerLogger = this.logger.child({ provider: provider.name });
      try {
        const rawItems = await provider.fetchOpportunities(fetchParams);
        providerLogger.debug({ count: rawItems.length }, 'Provider returned items');

        for (const raw of rawItems) {
          const score = this.scoringService.score(raw, fetchParams);
          const opportunity = Opportunity.create({
            title: raw.title,
            summary: raw.summary,
            source: provider.source,
            sourceUrl: raw.url,
            score,
            keywords: params.keywords ?? [],
            metadata: raw.metadata,
            publishedAt: raw.publishedAt,
          });

          const saved = await this.repository.save(opportunity);
          opportunities.push(saved);
        }
      } catch (error) {
        providerLogger.error({ error }, 'Provider discovery failed — skipping');
      }
    }

    this.logger.info({ count: opportunities.length }, 'Discovery run complete');
    return opportunities;
  }

  async getOpportunities(filter?: OpportunityFilter): Promise<Opportunity[]> {
    return this.repository.findAll(filter);
  }

  async reviewOpportunity(id: string, accepted: boolean): Promise<Opportunity> {
    const status = accepted ? OpportunityStatus.ACCEPTED : OpportunityStatus.REJECTED;
    return this.repository.update(id, { status });
  }

  private resolveProviders(params: DiscoverParams): ReadonlyArray<IDiscoveryProvider> {
    const { providerNames } = params;
    if (providerNames !== undefined && providerNames.length > 0) {
      return providerNames
        .map(name => this.registry.get(name))
        .filter((p): p is IDiscoveryProvider => p !== undefined && p.isConfigured());
    }
    return this.registry.getConfigured();
  }
}

function buildFetchParams(params: DiscoverParams): FetchParams {
  const out: FetchParams = {};
  if (params.keywords !== undefined) out.keywords = params.keywords;
  if (params.limit !== undefined) out.limit = params.limit;
  if (params.since !== undefined) out.since = params.since;
  return out;
}
