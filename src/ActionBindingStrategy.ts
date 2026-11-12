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
   * null or undefined raises no event. With no transformer, the strategy
   * builds the event class from the action's arguments, as PHPNomad's
   * WordPress integration does with `new $eventClass(...$args)`.
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
 * Token for the ActionBindingStrategy interface.
 */
export const ActionBindingStrategy = createToken<ActionBindingStrategy>('tsnomad/event/ActionBindingStrategy');
