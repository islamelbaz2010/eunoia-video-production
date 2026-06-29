import type { DomainEvent } from './DomainEvent';
import type { EventHandler, IEventBus } from './IEventBus';
import type { ILogger } from '../../shared/logger/ILogger';

export class InMemoryEventBus implements IEventBus {
  private readonly handlers = new Map<string, Set<EventHandler<DomainEvent>>>();

  constructor(private readonly logger: ILogger) {}

  async publish<T extends DomainEvent>(event: T): Promise<void> {
    const eventHandlers = this.handlers.get(event.eventType);
    if (eventHandlers === undefined || eventHandlers.size === 0) {
      return;
    }

    for (const handler of eventHandlers) {
      try {
        await handler(event);
      } catch (error) {
        this.logger.error(
          { error, eventType: event.eventType, eventId: event.eventId },
          'Event handler threw an error',
        );
      }
    }
  }

  subscribe<T extends DomainEvent>(eventType: string, handler: EventHandler<T>): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler as EventHandler<DomainEvent>);
  }

  unsubscribe(eventType: string, handler: EventHandler<DomainEvent>): void {
    this.handlers.get(eventType)?.delete(handler);
  }
}
