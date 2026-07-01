import type { ExecutionPlan } from '../models/ExecutionPlan';
import type { ExecutionCheckpoint } from '../models/ExecutionCheckpoint';
import type { ExecutionStatus } from '../models/ExecutionStatus';

export interface ExecutionFilter {
  status?: ExecutionStatus;
  campaignId?: string;
  ownerId?: string;
  limit?: number;
  offset?: number;
}

export interface IExecutionRepository {
  savePlan(plan: ExecutionPlan): Promise<ExecutionPlan>;
  findPlanById(id: string): Promise<ExecutionPlan | null>;
  findAllPlans(filter?: ExecutionFilter): Promise<ExecutionPlan[]>;
  deletePlan(id: string): Promise<void>;
  saveCheckpoint(checkpoint: ExecutionCheckpoint): Promise<ExecutionCheckpoint>;
  findCheckpointsByPlanId(planId: string): Promise<ExecutionCheckpoint[]>;
  findLatestCheckpoint(planId: string): Promise<ExecutionCheckpoint | null>;
}
