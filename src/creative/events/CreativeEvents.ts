import type { DomainEvent } from '../../core/events/DomainEvent';
import type { CreativeStrategyType } from '../domain/types';

export const CREATIVE_EVENT_TYPES = {
  PlanGenerated: 'creative.plan_generated',
  PromptPackageCreated: 'creative.prompt_package_created',
  ProductionPlanCreated: 'creative.production_plan_created',
  PlanApproved: 'creative.plan_approved',
  PlanRejected: 'creative.plan_rejected',
} as const;

export type CreativeEventType = (typeof CREATIVE_EVENT_TYPES)[keyof typeof CREATIVE_EVENT_TYPES];

export interface CreativePlanGeneratedPayload {
  campaignId: string;
  strategyType: CreativeStrategyType;
  promptCount: number;
  platformCount: number;
}

export interface CreativePlanGenerated extends DomainEvent {
  readonly eventType: typeof CREATIVE_EVENT_TYPES.PlanGenerated;
  readonly payload: CreativePlanGeneratedPayload;
}

export interface PromptPackageCreatedPayload {
  planId: string;
  llmPromptCount: number;
  imagePromptCount: number;
  videoPromptCount: number;
  voicePromptCount: number;
  musicPromptCount: number;
}

export interface PromptPackageCreated extends DomainEvent {
  readonly eventType: typeof CREATIVE_EVENT_TYPES.PromptPackageCreated;
  readonly payload: PromptPackageCreatedPayload;
}

export interface ProductionPlanCreatedPayload {
  planId: string;
  sceneCount: number;
  estimatedProductionDays: number;
  platformCount: number;
}

export interface ProductionPlanCreated extends DomainEvent {
  readonly eventType: typeof CREATIVE_EVENT_TYPES.ProductionPlanCreated;
  readonly payload: ProductionPlanCreatedPayload;
}

export interface CreativePlanApprovedPayload {
  planId: string;
  campaignId: string;
}

export interface CreativePlanApproved extends DomainEvent {
  readonly eventType: typeof CREATIVE_EVENT_TYPES.PlanApproved;
  readonly payload: CreativePlanApprovedPayload;
}

export interface CreativePlanRejectedPayload {
  planId: string;
  campaignId: string;
  reason: string;
}

export interface CreativePlanRejected extends DomainEvent {
  readonly eventType: typeof CREATIVE_EVENT_TYPES.PlanRejected;
  readonly payload: CreativePlanRejectedPayload;
}
