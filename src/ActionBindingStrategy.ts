/**
 * ActionBindingStrategy
 *
 * PHPNomad's `PHPNomad\Events\Interfaces\ActionBindingStrategy`. A
 * platform implements it to turn its own actions, such as a Medusa
 * subscriber event or a WordPress hook, into TS Nomad events.
 */

import { createToken } from '@tsnomad/di-container';
import type { ActionTransformer, Event, EventClass } from './types.js';

export interface ActionBindingStrategy {
  /**
   * Binds a platform action to an event. When the action fires, the
   * strategy calls the transformer with the action's arguments and
   * broadcasts what it answers through the EventStrategy. An answer of
   * null raises no event, as PHPNomad's WordPress integration skips a
   * falsy answer. With no transformer, the strategy builds the event
   * class from the action's arguments, as that integration does with
   * `new $eventClass(...$args)`.
   *
   * Failures go back to the platform. The callback the strategy
   * registers returns, or awaits, the transformer and the broadcast, so
   * a transformer that throws and a broadcast that rejects with its
   * AggregateError both reach the platform's caller. The strategy never
   * swallows either and never retries. A platform that reruns a failed
   * action reruns every listener, so listeners must tolerate running
   * again, and work that must survive a failure belongs behind the
   * durable queue.
   *
   * @param eventClass - The event class the action raises. A string
   *   event id is accepted from 0.1 implementations and needs a
   *   transformer.
   * @param action - The platform's action name, such as 'order.placed'
   * @param transformer - Builds the event from the action's arguments
   */
  bindAction<E extends Event>(
    eventClass: EventClass<E> | string,
    action: string,
    transformer?: ActionTransformer<E>
  ): void;
}

/**
 * Token for the ActionBindingStrategy interface, named after it.
 */
export const ActionBindingStrategy = createToken<ActionBindingStrategy>('ActionBindingStrategy');
