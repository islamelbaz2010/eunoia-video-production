import type { InvestmentDecision } from '../models/InvestmentDecision';
import type { DecisionOutcome, DecisionSubjectType } from '../models/InvestmentDecision';

export interface RevenueFilter {
  outcome?: DecisionOutcome;
  subjectType?: DecisionSubjectType;
  subjectId?: string;
  since?: Date;
  limit?: number;
  offset?: number;
}

export interface IRevenueRepository {
  save(decision: InvestmentDecision): Promise<InvestmentDecision>;
  findById(id: string): Promise<InvestmentDecision | null>;
  findByCampaignId(campaignId: string): Promise<InvestmentDecision[]>;
  findByOpportunityId(opportunityId: string): Promise<InvestmentDecision[]>;
  findAll(filter?: RevenueFilter): Promise<InvestmentDecision[]>;
  delete(id: string): Promise<void>;
  count(filter?: RevenueFilter): Promise<number>;
}
