import type { DiscoverySource } from '../providers/IDiscoveryProvider';
import type { Opportunity, OpportunityStatus } from '../models/Opportunity';

export interface OpportunityFilter {
  status?: OpportunityStatus;
  source?: DiscoverySource;
  minScore?: number;
  since?: Date;
  limit?: number;
  offset?: number;
}

export interface OpportunityPatch {
  status?: OpportunityStatus;
}

export interface IOpportunityRepository {
  save(opportunity: Opportunity): Promise<Opportunity>;
  findById(id: string): Promise<Opportunity | null>;
  findAll(filter?: OpportunityFilter): Promise<Opportunity[]>;
  update(id: string, patch: OpportunityPatch): Promise<Opportunity>;
  delete(id: string): Promise<void>;
  count(filter?: OpportunityFilter): Promise<number>;
}
