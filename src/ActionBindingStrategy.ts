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
   * null raises no event. PHPNomad's WordPress integration skips any
   * falsy answer. This one accepts only an event or null, and throws a
   * TypeError naming the action for any other answer, so a JavaScript
   * transformer that forgets to return fails where it can be seen. With
   * no transformer, the strategy builds the event class from the
   * action's arguments, as that integration does with
   * `new $eventClass(...$args)`.
   *
   * Where a failure goes depends on whether the platform waits for the
   * callback the strategy registers.
   * - When the platform awaits the callback's promise, as a Medusa
   *   subscriber does, the callback returns the transformer and the
   *   broadcast, so a transformer that throws and a broadcast that
   *   rejects with its AggregateError both reach the platform's caller.
   * - When the platform ignores what the callback returns, as an
   *   EventEmitter or a timer does, nothing would receive the
   *   rejection. The callback catches it and logs it at error level
   *   with the action name, the event id and the error, then returns.
   *
   * The strategy never drops a failure without logging it and never
   * retries. A platform that reruns a failed action reruns every
   * listener, so listeners must tolerate running again, as
   * `CanHandle.handle` describes, and work that must survive a failure
   * belongs behind the durable queue.
   *
   * @param eventClass - The event class the action raises
   * @param action - The platform's action name, such as 'order.placed'
   * @param transformer - Builds the event from the action's arguments
   */
  bindAction<E extends Event>(eventClass: EventClass<E>, action: string, transformer?: ActionTransformer<E>): void;

  /**
   * The 0.1 form, binding by event id. An id cannot build an event, so
   * the transformer is required. An implementation that receives a
   * string id with no transformer at run time throws a TypeError naming
   * the action.
   *
   * @param eventId - The event id the transformer's events carry
   * @param action - The platform's action name
   * @param transformer - Builds the event from the action's arguments
   */
  bindAction<E extends Event = Event>(eventId: string, action: string, transformer: ActionTransformer<E>): void;
}

/**
 * Token for the ActionBindingStrategy interface, named after it.
 */
export const ActionBindingStrategy = createToken<ActionBindingStrategy>('ActionBindingStrategy');
