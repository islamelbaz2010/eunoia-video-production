import type { Campaign, CampaignStatus, CampaignType, CampaignPriority } from '../models/Campaign';
import type { CampaignBudget } from '../models/CampaignBudget';
import type { CampaignMetrics } from '../models/CampaignMetrics';
import type { CampaignLifecycle } from '../models/CampaignLifecycle';

export interface CampaignFilter {
  status?: CampaignStatus;
  type?: CampaignType;
  priority?: CampaignPriority;
  ownerId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CampaignPatch {
  name?: string;
  description?: string;
  status?: CampaignStatus;
  priority?: CampaignPriority;
  budget?: CampaignBudget;
  metrics?: CampaignMetrics;
  lifecycle?: CampaignLifecycle;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface ICampaignRepository {
  save(campaign: Campaign): Promise<Campaign>;
  findById(id: string): Promise<Campaign | null>;
  findAll(filter?: CampaignFilter): Promise<Campaign[]>;
  update(id: string, patch: CampaignPatch): Promise<Campaign>;
  delete(id: string): Promise<void>;
  count(filter?: CampaignFilter): Promise<number>;
  search(query: string, filter?: Omit<CampaignFilter, 'search'>): Promise<Campaign[]>;
}
