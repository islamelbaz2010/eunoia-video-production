import type { DomainEvent } from '../../core/events/DomainEvent';
import type { DecisionOutcome } from '../domain/models/InvestmentScore';

export const REVENUE_EVENT_TYPES = {
  RevenuePredicted: 'revenue.predicted',
  InvestmentApproved: 'revenue.investment_approved',
  InvestmentRejected: 'revenue.investment_rejected',
  InvestmentRequiresReview: 'revenue.investment_requires_review',
} as const;

export type RevenueEventType = (typeof REVENUE_EVENT_TYPES)[keyof typeof REVENUE_EVENT_TYPES];

export interface RevenuePredictedPayload {
  subjectId: string;
  estimatedRevenue: number;
  estimatedROI: number;
  confidenceLevel: number;
}

export interface RevenuePredicted extends DomainEvent {
  readonly eventType: typeof REVENUE_EVENT_TYPES.RevenuePredicted;
  readonly payload: RevenuePredictedPayload;
}

export interface InvestmentApprovedPayload {
  subjectId: string;
  score: number;
  outcome: DecisionOutcome;
  estimatedRevenue: number;
}

export interface InvestmentApproved extends DomainEvent {
  readonly eventType: typeof REVENUE_EVENT_TYPES.InvestmentApproved;
  readonly payload: InvestmentApprovedPayload;
}

export interface InvestmentRejectedPayload {
  subjectId: string;
  score: number;
  outcome: DecisionOutcome;
  reason: string;
}

export interface InvestmentRejected extends DomainEvent {
  readonly eventType: typeof REVENUE_EVENT_TYPES.InvestmentRejected;
  readonly payload: InvestmentRejectedPayload;
}

export interface InvestmentRequiresReviewPayload {
  subjectId: string;
  score: number;
  outcome: DecisionOutcome;
  riskFactors: string[];
}

export interface InvestmentRequiresReview extends DomainEvent {
  readonly eventType: typeof REVENUE_EVENT_TYPES.InvestmentRequiresReview;
  readonly payload: InvestmentRequiresReviewPayload;
}
