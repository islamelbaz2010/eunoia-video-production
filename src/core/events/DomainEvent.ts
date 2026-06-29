import { randomUUID } from 'crypto';

export interface DomainEvent {
  readonly eventId: string;
  readonly eventType: string;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly payload: unknown;
}

export function createDomainEvent(
  eventType: string,
  aggregateId: string,
  payload: unknown,
): DomainEvent {
  return {
    eventId: randomUUID(),
    eventType,
    aggregateId,
    payload,
    occurredAt: new Date(),
  };
}
