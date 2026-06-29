// Domain — models
export { Opportunity, OpportunityStatus } from './domain/models/Opportunity';
export type { OpportunityProps, CreateOpportunityProps } from './domain/models/Opportunity';
export { OpportunityScore } from './domain/models/OpportunityScore';
export type { OpportunityScoreProps } from './domain/models/OpportunityScore';

// Domain — provider contract
export { DiscoverySource } from './domain/providers/IDiscoveryProvider';
export type { FetchParams, RawOpportunity, IDiscoveryProvider } from './domain/providers/IDiscoveryProvider';

// Domain — repository contract
export type {
  IOpportunityRepository,
  OpportunityFilter,
  OpportunityPatch,
} from './domain/repositories/IOpportunityRepository';

// Domain — registry contract
export type { IProviderRegistry } from './domain/registry/IProviderRegistry';

// Application — scoring
export type { IOpportunityScoringService } from './application/scoring/IOpportunityScoringService';
export { OpportunityScoringService } from './application/scoring/OpportunityScoringService';

// Application — service
export { DiscoveryService } from './application/services/DiscoveryService';
export type { DiscoverParams } from './application/services/DiscoveryService';

// Infrastructure — providers
export { RssProvider } from './infrastructure/providers/RssProvider';
export type { RssProviderConfig } from './infrastructure/providers/RssProvider';
export { GoogleTrendsProvider } from './infrastructure/providers/GoogleTrendsProvider';
export type { GoogleTrendsProviderConfig } from './infrastructure/providers/GoogleTrendsProvider';
export { RedditProvider } from './infrastructure/providers/RedditProvider';
export type { RedditProviderConfig } from './infrastructure/providers/RedditProvider';
export { YouTubeProvider } from './infrastructure/providers/YouTubeProvider';
export type { YouTubeProviderConfig } from './infrastructure/providers/YouTubeProvider';
export { WhopProvider } from './infrastructure/providers/WhopProvider';
export type { WhopProviderConfig } from './infrastructure/providers/WhopProvider';

// Infrastructure — registry
export { ProviderRegistry } from './infrastructure/registry/ProviderRegistry';

// Infrastructure — repository
export { SupabaseOpportunityRepository } from './infrastructure/repositories/SupabaseOpportunityRepository';
