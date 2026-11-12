/**
 * Compile-only checks for the event contracts. Not a runtime test.
 * Everything sits inside functions that never run, so `node --test`
 * reports this file as an empty pass, and `npm run typecheck` is what
 * makes it matter. Each `@ts-expect-error` line must stay an error, and
 * every other line must keep compiling.
 */

import { Container } from '@tsnomad/di-container';
import { EventStrategy } from '../dist/EventStrategy.js';
import type { ActionBindingStrategy } from '../dist/ActionBindingStrategy.js';
import { InMemoryEventStrategy } from '../dist/InMemoryEventStrategy.js';
import type {
  CanHandle,
  Event,
  HasEventBindings,
  HasListeners,
} from '../dist/types.js';
import { UserCreated, OrderPlaced, LegacyPing } from './fixtures.ts';

class WelcomeHandler implements CanHandle<UserCreated> {
  handle(event: UserCreated): void {
    void event.userId;
  }
}

class Listens implements HasListeners {
  getListeners() {
    return {
      [UserCreated.getId()]: [WelcomeHandler, (event: UserCreated) => void event.userId],
      [OrderPlaced.getId()]: WelcomeHandler,
    };
  }
}

class Binds implements HasEventBindings {
  getEventBindings() {
    return [
      [UserCreated, [{ action: 'customer.created', transformer: (id: string) => new UserCreated(id) }]],
      [OrderPlaced, 'order.placed'],
      [OrderPlaced, { action: 'order.updated', transformer: () => null }],
    ] as const;
  }
}

export function eventChecks(events: EventStrategy, bindings: ActionBindingStrategy): void {
  // The in-memory strategy satisfies the interface.
  const asInterface: EventStrategy = new InMemoryEventStrategy();
  void asInterface;

  // attach by class infers the listener's event type.
  events.attach(UserCreated, (event) => void event.userId);
  events.attach(UserCreated, (event) => void event.userId, 5);
  events.detach(UserCreated, () => {}, 5);

  // attach by id takes an explicit event type, or Event.
  events.attach<OrderPlaced>('order.placed', (event) => void event.total);
  events.attach('anything', () => {});

  // @ts-expect-error a class without a static getId is not an EventClass
  events.attach(LegacyPing, () => {});

  // @ts-expect-error the listener's event type must match the event class
  events.attach(UserCreated, (event: OrderPlaced) => void event.total);

  // @ts-expect-error priority is a number
  events.attach(UserCreated, () => {}, 'high');

  // bindAction takes an event class with an optional transformer.
  bindings.bindAction(UserCreated, 'customer.created', (id: string) => new UserCreated(id));
  bindings.bindAction(UserCreated, 'customer.created');
  bindings.bindAction(OrderPlaced, 'order.updated', async () => null);

  // @ts-expect-error the transformer must answer the bound event class, or null
  bindings.bindAction(UserCreated, 'customer.created', () => new OrderPlaced(1));

  // @ts-expect-error a transformer that forgets to return does not compile
  bindings.bindAction(UserCreated, 'customer.created', (id: string) => {
    void new UserCreated(id);
  });

  // bindAction by a 0.1 string id takes a transformer, with an explicit event type or Event.
  bindings.bindAction<UserCreated>('user.created', 'customer.created', (id: string) => new UserCreated(id));
  bindings.bindAction('order.placed', 'order.updated', async () => null);

  // @ts-expect-error a string id needs a transformer, because an id cannot build an event
  bindings.bindAction('order.placed', 'order.placed');

  // @ts-expect-error an async transformer that forgets to return does not compile, with a string id
  bindings.bindAction('order.placed', 'order.updated', async () => {});

  // @ts-expect-error nor with the Event type spelled out
  bindings.bindAction<Event>('order.placed', 'order.updated', async () => {});

  // The documented wiring compiles: one shared bus under the token and the class.
  new Container().bind(InMemoryEventStrategy, EventStrategy, InMemoryEventStrategy);

  void new Listens();
  void new Binds();
}
