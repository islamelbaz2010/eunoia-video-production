import type { FetchParams, RawOpportunity } from '../../domain/providers/IDiscoveryProvider';
import type { OpportunityScore } from '../../domain/models/OpportunityScore';

export interface IOpportunityScoringService {
  score(raw: RawOpportunity, params: FetchParams): OpportunityScore;
}
