import type { DomainEvent } from '../../core/events/DomainEvent';
import type { ExecutionStatus } from '../domain/models/ExecutionStatus';
import type { NodeType } from '../domain/models/NodeType';

export const EXECUTION_EVENT_TYPES = {
  Started: 'execution.started',
  NodeStarted: 'execution.node_started',
  NodeCompleted: 'execution.node_completed',
  NodeFailed: 'execution.node_failed',
  Paused: 'execution.paused',
  Resumed: 'execution.resumed',
  Cancelled: 'execution.cancelled',
  Finished: 'execution.finished',
} as const;

export type ExecutionEventType = (typeof EXECUTION_EVENT_TYPES)[keyof typeof EXECUTION_EVENT_TYPES];

export interface ExecutionStartedPayload {
  ownerId: string;
  campaignId: string | null;
  nodeCount: number;
}

export interface ExecutionStarted extends DomainEvent {
  readonly eventType: typeof EXECUTION_EVENT_TYPES.Started;
  readonly payload: ExecutionStartedPayload;
}

export interface ExecutionNodeStartedPayload {
  nodeId: string;
  nodeType: NodeType;
  planId: string;
}

export interface ExecutionNodeStarted extends DomainEvent {
  readonly eventType: typeof EXECUTION_EVENT_TYPES.NodeStarted;
  readonly payload: ExecutionNodeStartedPayload;
}

export interface ExecutionNodeCompletedPayload {
  nodeId: string;
  nodeType: NodeType;
  planId: string;
  durationMs: number;
}

export interface ExecutionNodeCompleted extends DomainEvent {
  readonly eventType: typeof EXECUTION_EVENT_TYPES.NodeCompleted;
  readonly payload: ExecutionNodeCompletedPayload;
}

export interface ExecutionNodeFailedPayload {
  nodeId: string;
  nodeType: NodeType;
  planId: string;
  error: string;
  retryCount: number;
  willRetry: boolean;
}

export interface ExecutionNodeFailed extends DomainEvent {
  readonly eventType: typeof EXECUTION_EVENT_TYPES.NodeFailed;
  readonly payload: ExecutionNodeFailedPayload;
}

export interface ExecutionPausedPayload {
  pausedAt: Date;
}

export interface ExecutionPaused extends DomainEvent {
  readonly eventType: typeof EXECUTION_EVENT_TYPES.Paused;
  readonly payload: ExecutionPausedPayload;
}

export interface ExecutionResumedPayload {
  resumedAt: Date;
  fromCheckpointId: string | null;
}

export interface ExecutionResumed extends DomainEvent {
  readonly eventType: typeof EXECUTION_EVENT_TYPES.Resumed;
  readonly payload: ExecutionResumedPayload;
}

export interface ExecutionCancelledPayload {
  cancelledAt: Date;
  reason: string | null;
}

export interface ExecutionCancelled extends DomainEvent {
  readonly eventType: typeof EXECUTION_EVENT_TYPES.Cancelled;
  readonly payload: ExecutionCancelledPayload;
}

export interface ExecutionFinishedPayload {
  status: ExecutionStatus;
  completedAt: Date;
  durationMs: number;
  succeededNodes: number;
  failedNodes: number;
}

export interface ExecutionFinished extends DomainEvent {
  readonly eventType: typeof EXECUTION_EVENT_TYPES.Finished;
  readonly payload: ExecutionFinishedPayload;
}
