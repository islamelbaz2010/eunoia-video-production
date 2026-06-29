import { InMemoryEventBus } from '../../../src/core/events/InMemoryEventBus';
import { createDomainEvent, type DomainEvent } from '../../../src/core/events/DomainEvent';
import type { ILogger } from '../../../src/shared/logger/ILogger';

function makeLogger(): jest.Mocked<ILogger> {
  return {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: jest.fn().mockReturnThis(),
  } as unknown as jest.Mocked<ILogger>;
}

function makeEvent(eventType: string, aggregateId = 'agg-1', payload: unknown = {}): DomainEvent {
  return createDomainEvent(eventType, aggregateId, payload);
}

describe('InMemoryEventBus', () => {
  let logger: jest.Mocked<ILogger>;
  let bus: InMemoryEventBus;

  beforeEach(() => {
    logger = makeLogger();
    bus = new InMemoryEventBus(logger);
  });

  it('calls all handlers for the matching eventType', async () => {
    const handlerA = jest.fn();
    const handlerB = jest.fn();
    bus.subscribe('order.created', handlerA);
    bus.subscribe('order.created', handlerB);

    const event = makeEvent('order.created');
    await bus.publish(event);

    expect(handlerA).toHaveBeenCalledWith(event);
    expect(handlerB).toHaveBeenCalledWith(event);
  });

  it('does not call handlers registered for a different eventType', async () => {
    const handler = jest.fn();
    bus.subscribe('order.shipped', handler);

    await bus.publish(makeEvent('order.created'));

    expect(handler).not.toHaveBeenCalled();
  });

  it('does not throw when no handlers are registered', async () => {
    await expect(bus.publish(makeEvent('unknown.event'))).resolves.toBeUndefined();
  });

  it('removes handler after unsubscribe', async () => {
    const handler = jest.fn();
    bus.subscribe('order.created', handler);
    bus.unsubscribe('order.created', handler);

    await bus.publish(makeEvent('order.created'));

    expect(handler).not.toHaveBeenCalled();
  });

  it('catches handler errors and logs them, allowing other handlers to run', async () => {
    const errorHandler = jest.fn().mockRejectedValue(new Error('handler failure'));
    const goodHandler = jest.fn();

    bus.subscribe('payment.received', errorHandler);
    bus.subscribe('payment.received', goodHandler);

    await bus.publish(makeEvent('payment.received'));

    expect(logger.error).toHaveBeenCalled();
    expect(goodHandler).toHaveBeenCalled();
  });

  it('passes typed event payload to handler', async () => {
    interface OrderCreated extends DomainEvent {
      payload: { orderId: string; amount: number };
    }

    const received: OrderCreated[] = [];
    bus.subscribe<OrderCreated>('order.created', event => {
      received.push(event);
    });

    const event = makeEvent('order.created', 'agg-1', { orderId: 'o-1', amount: 99 });
    await bus.publish(event);

    expect(received).toHaveLength(1);
    expect((received[0] as OrderCreated).payload).toEqual({ orderId: 'o-1', amount: 99 });
  });

  it('does not affect other event types when unsubscribing', async () => {
    const handler = jest.fn();
    bus.subscribe('order.created', handler);
    bus.subscribe('order.shipped', handler);

    bus.unsubscribe('order.created', handler);

    await bus.publish(makeEvent('order.shipped'));
    expect(handler).toHaveBeenCalledTimes(1);

    await bus.publish(makeEvent('order.created'));
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
