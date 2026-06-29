import type { DomainEvent } from './DomainEvent';

export type EventHandler<T extends DomainEvent = DomainEvent> = (event: T) => Promise<void> | void;

export interface IEventBus {
  publish<T extends DomainEvent>(event: T): Promise<void>;
  subscribe<T extends DomainEvent>(eventType: string, handler: EventHandler<T>): void;
  unsubscribe(eventType: string, handler: EventHandler<DomainEvent>): void;
}
