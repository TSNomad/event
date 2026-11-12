/**
 * EventStrategy
 *
 * PHPNomad's `PHPNomad\Events\Interfaces\EventStrategy`: broadcast an
 * event, attach and detach listeners with a priority. Implementations
 * live elsewhere. `InMemoryEventStrategy` is the one this package ships.
 */

import { createToken } from '@tsnomad/di-container';
import type { Event, EventClass, Listener, Subscription } from './types.js';

/**
 * The priority a listener gets when `attach` is called without one, as
 * in the WordPress integration. Lower numbers run first.
 */
export const DEFAULT_PRIORITY = 10;

export interface EventStrategy {
  /**
   * Runs every listener attached to the event's id, one at a time, in
   * priority order, lowest number first, and in attach order within one
   * priority. Each listener's promise settles before the next starts.
   *
   * Every listener runs even when an earlier one throws. If any threw,
   * the returned promise rejects with one AggregateError holding each
   * error in the order the listeners ran (A30).
   *
   * The listeners that run are the ones attached when broadcast starts.
   * An attach or detach made by a listener takes effect from the next
   * broadcast.
   *
   * Where this differs from PHPNomad: async (A26), and errors are
   * collected instead of stopping at the first one.
   *
   * @throws TypeError, through the returned promise, when the event has
   *   no id, see `eventIdOf`
   */
  broadcast<E extends Event>(event: E): Promise<void>;

  /**
   * Attaches a listener to an event, by class or by id.
   *
   * Attaching the same listener to the same event at the same priority
   * twice leaves one registration. The same listener at two priorities
   * runs once at each.
   *
   * @param event - An event class, read through its static getId(), or an id
   * @param action - The listener, sync or async
   * @param priority - Lower runs first. Defaults to DEFAULT_PRIORITY.
   */
  attach<E extends Event>(event: EventClass<E>, action: Listener<NoInfer<E>>, priority?: number): void;
  attach<E extends Event = Event>(eventId: string, action: Listener<E>, priority?: number): void;

  /**
   * Detaches a listener. With a priority, only the registration at that
   * priority goes. Without one, the listener goes at every priority.
   * Detaching a listener that is not attached does nothing.
   */
  detach<E extends Event>(event: EventClass<E>, action: Listener<NoInfer<E>>, priority?: number): void;
  detach<E extends Event = Event>(eventId: string, action: Listener<E>, priority?: number): void;

  /**
   * The 0.1 way to listen: attach at DEFAULT_PRIORITY and get a handle
   * that detaches.
   *
   * @deprecated Use attach. It stays on the interface for 0.2.x because
   * @tsnomad/loader 0.1 calls it through this type, and every consumer
   * builds that loader on install. Slice 7 moves the loader to attach.
   */
  addListener<E extends Event>(eventId: string, listener: Listener<E>): Subscription;
}

/**
 * Token for the EventStrategy interface, so code reads
 * `container.get(EventStrategy)` as PHP reads
 * `$container->get(EventStrategy::class)`.
 */
export const EventStrategy = createToken<EventStrategy>('tsnomad/event/EventStrategy');
