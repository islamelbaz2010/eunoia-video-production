import { EXECUTION_EVENT_TYPES } from '../../../src/execution/events/ExecutionEvents';
import { createDomainEvent } from '../../../src/core/events/DomainEvent';
import { ExecutionStatus } from '../../../src/execution/domain/models/ExecutionStatus';
import { NodeType } from '../../../src/execution/domain/models/NodeType';

describe('EXECUTION_EVENT_TYPES', () => {
  it('contains all expected event type constants', () => {
    expect(EXECUTION_EVENT_TYPES.Started).toBe('execution.started');
    expect(EXECUTION_EVENT_TYPES.NodeStarted).toBe('execution.node_started');
    expect(EXECUTION_EVENT_TYPES.NodeCompleted).toBe('execution.node_completed');
    expect(EXECUTION_EVENT_TYPES.NodeFailed).toBe('execution.node_failed');
    expect(EXECUTION_EVENT_TYPES.Paused).toBe('execution.paused');
    expect(EXECUTION_EVENT_TYPES.Resumed).toBe('execution.resumed');
    expect(EXECUTION_EVENT_TYPES.Cancelled).toBe('execution.cancelled');
    expect(EXECUTION_EVENT_TYPES.Finished).toBe('execution.finished');
  });

  it('creates a valid DomainEvent for ExecutionStarted', () => {
    const event = createDomainEvent(EXECUTION_EVENT_TYPES.Started, 'plan-1', {
      ownerId: 'owner-1',
      campaignId: null,
      nodeCount: 5,
    });
    expect(event.eventType).toBe(EXECUTION_EVENT_TYPES.Started);
    expect(event.aggregateId).toBe('plan-1');
    expect(event.eventId).toBeDefined();
    expect(event.occurredAt).toBeInstanceOf(Date);
  });

  it('creates a valid DomainEvent for ExecutionNodeStarted', () => {
    const event = createDomainEvent(EXECUTION_EVENT_TYPES.NodeStarted, 'plan-1', {
      nodeId: 'node-1',
      nodeType: NodeType.GenerateScript,
      planId: 'plan-1',
    });
    expect(event.eventType).toBe(EXECUTION_EVENT_TYPES.NodeStarted);
  });

  it('creates a valid DomainEvent for ExecutionFinished', () => {
    const event = createDomainEvent(EXECUTION_EVENT_TYPES.Finished, 'plan-1', {
      status: ExecutionStatus.Succeeded,
      completedAt: new Date(),
      durationMs: 60000,
      succeededNodes: 5,
      failedNodes: 0,
    });
    expect(event.eventType).toBe(EXECUTION_EVENT_TYPES.Finished);
    expect((event.payload as { succeededNodes: number }).succeededNodes).toBe(5);
  });

  it('creates a valid DomainEvent for ExecutionCancelled', () => {
    const event = createDomainEvent(EXECUTION_EVENT_TYPES.Cancelled, 'plan-1', {
      cancelledAt: new Date(),
      reason: 'user request',
    });
    expect(event.eventType).toBe(EXECUTION_EVENT_TYPES.Cancelled);
  });

  it('creates a valid DomainEvent for ExecutionNodeFailed', () => {
    const event = createDomainEvent(EXECUTION_EVENT_TYPES.NodeFailed, 'plan-1', {
      nodeId: 'node-2',
      nodeType: NodeType.GenerateImage,
      planId: 'plan-1',
      error: 'API timeout',
      retryCount: 1,
      willRetry: true,
    });
    expect(event.eventType).toBe(EXECUTION_EVENT_TYPES.NodeFailed);
    expect((event.payload as { willRetry: boolean }).willRetry).toBe(true);
  });
});
