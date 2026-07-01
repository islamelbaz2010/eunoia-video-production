import type { CreativePlan } from '../models/CreativePlan';
import type { CreativePlanStatus } from '../types';

export interface CreativeFilter {
  campaignId?: string;
  status?: CreativePlanStatus;
  since?: Date;
  limit?: number;
  offset?: number;
}

export interface CreativePatch {
  status?: CreativePlanStatus;
  approvedAt?: Date | null;
  rejectedAt?: Date | null;
  rejectionReason?: string | null;
}

export interface ICreativeRepository {
  save(plan: CreativePlan): Promise<CreativePlan>;
  findById(id: string): Promise<CreativePlan | null>;
  findByCampaignId(campaignId: string): Promise<CreativePlan[]>;
  findAll(filter?: CreativeFilter): Promise<CreativePlan[]>;
  update(id: string, patch: CreativePatch): Promise<CreativePlan>;
  delete(id: string): Promise<void>;
  count(filter?: CreativeFilter): Promise<number>;
}
