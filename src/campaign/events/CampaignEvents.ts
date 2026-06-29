import type { DomainEvent } from '../../core/events/DomainEvent';
import type { CampaignType } from '../domain/models/Campaign';

export const CAMPAIGN_EVENT_TYPES = {
  Created: 'campaign.created',
  Approved: 'campaign.approved',
  Started: 'campaign.started',
  Paused: 'campaign.paused',
  Completed: 'campaign.completed',
  Cancelled: 'campaign.cancelled',
  Archived: 'campaign.archived',
  BudgetExceeded: 'campaign.budget_exceeded',
} as const;

export type CampaignEventType = (typeof CAMPAIGN_EVENT_TYPES)[keyof typeof CAMPAIGN_EVENT_TYPES];

export interface CampaignCreatedPayload {
  name: string;
  ownerId: string;
  type: CampaignType;
}

export interface CampaignCreated extends DomainEvent {
  readonly eventType: typeof CAMPAIGN_EVENT_TYPES.Created;
  readonly payload: CampaignCreatedPayload;
}

export interface CampaignApprovedPayload {
  approvedAt: Date;
}

export interface CampaignApproved extends DomainEvent {
  readonly eventType: typeof CAMPAIGN_EVENT_TYPES.Approved;
  readonly payload: CampaignApprovedPayload;
}

export interface CampaignStartedPayload {
  startedAt: Date;
}

export interface CampaignStarted extends DomainEvent {
  readonly eventType: typeof CAMPAIGN_EVENT_TYPES.Started;
  readonly payload: CampaignStartedPayload;
}

export interface CampaignPausedPayload {
  pausedAt: Date;
}

export interface CampaignPaused extends DomainEvent {
  readonly eventType: typeof CAMPAIGN_EVENT_TYPES.Paused;
  readonly payload: CampaignPausedPayload;
}

export interface CampaignCompletedPayload {
  completedAt: Date;
}

export interface CampaignCompleted extends DomainEvent {
  readonly eventType: typeof CAMPAIGN_EVENT_TYPES.Completed;
  readonly payload: CampaignCompletedPayload;
}

export interface CampaignCancelledPayload {
  cancelledAt: Date;
}

export interface CampaignCancelled extends DomainEvent {
  readonly eventType: typeof CAMPAIGN_EVENT_TYPES.Cancelled;
  readonly payload: CampaignCancelledPayload;
}

export interface CampaignArchivedPayload {
  archivedAt: Date;
}

export interface CampaignArchived extends DomainEvent {
  readonly eventType: typeof CAMPAIGN_EVENT_TYPES.Archived;
  readonly payload: CampaignArchivedPayload;
}

export interface CampaignBudgetExceededPayload {
  allocated: number;
  spent: number;
  currency: string;
}

export interface CampaignBudgetExceeded extends DomainEvent {
  readonly eventType: typeof CAMPAIGN_EVENT_TYPES.BudgetExceeded;
  readonly payload: CampaignBudgetExceededPayload;
}
