/**
 * EventStrategy
 *
 * PHPNomad's `PHPNomad\Events\Interfaces\EventStrategy`: broadcast an
 * event, attach and detach listeners with a priority. Implementations
 * live elsewhere. `InMemoryEventStrategy` is the one this package ships.
 */

import { createToken } from '@tsnomad/di-container';
import type { Event, EventClass, EventInstance, Listener, Subscription } from './types.js';

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
   * error, unchanged, in the order the listeners ran. Its message is
   * the 0.1 text, `N listener(s) threw during broadcast of 'id'`. A
   * listener whose promise never settles stalls the broadcast and every
   * listener after it, because there is no per-listener timeout. A
   * listener that waits on something slow gives it its own timeout.
   * The strategy never runs a listener
   * twice for one broadcast and never retries. A caller that broadcasts
   * the same event again after a failure runs every listener again,
   * including the ones that succeeded, so listeners must tolerate that,
   * as `CanHandle.handle` describes. Work that must survive a failure
   * belongs behind a durable queue.
   *
   * The listeners that run are the ones attached when broadcast starts.
   * An attach or detach made by a listener takes effect from the next
   * broadcast.
   *
   * Where this differs from PHPNomad: it is async, and errors are
   * collected instead of stopping at the first one.
   *
   * @throws TypeError, through the returned promise, when the event has
   *   no id, see `eventIdOf`, or when it is an event class instead of an
   *   instance of one
   */
  broadcast<E extends Event>(event: EventInstance<E>): Promise<void>;

  /**
   * Attaches a listener to an event, by class or by id.
   *
   * Attaching the same listener to the same event at the same priority
   * twice leaves one registration. The same listener at two priorities
   * runs once at each.
   *
   * @param event - An event class, read through its static getId(), or
   *   an id string, used as given
   * @param action - The listener, sync or async
   * @param priority - An integer. Lower runs first. Defaults to
   *   DEFAULT_PRIORITY.
   * @throws TypeError when the id string is empty, or the class has no
   *   static id, see `eventIdOf`
   * @throws RangeError when the priority is not an integer
   */
  attach<E extends Event>(event: EventClass<E>, action: Listener<NoInfer<E>>, priority?: number): void;
  attach<E extends Event = Event>(eventId: string, action: Listener<E>, priority?: number): void;

  /**
   * Detaches the listener's registration at one priority, which
   * defaults to DEFAULT_PRIORITY, as PHPNomad's WordPress strategy
   * passes 10 to `remove_action`. Registrations at other priorities
   * stay. Detaching a listener that is not attached there does nothing.
   *
   * @throws TypeError and RangeError on the same inputs as `attach`
   */
  detach<E extends Event>(event: EventClass<E>, action: Listener<NoInfer<E>>, priority?: number): void;
  detach<E extends Event = Event>(eventId: string, action: Listener<E>, priority?: number): void;

  /**
   * The 0.1 way to listen: attach at DEFAULT_PRIORITY and get a handle
   * whose `unsubscribe()` removes the registration this call made, or
   * found when the listener was already attached there. Once that
   * registration is gone, the handle does nothing. See
   * `InMemoryEventStrategy.addListener`.
   *
   * @throws TypeError when the id is empty
   *
   * @deprecated Use attach. It stays on the interface for 0.2.x because
   * @tsnomad/loader 0.1 calls it through this type, and every consumer
   * builds that loader on install. It leaves once the loader calls attach.
   */
  addListener<E extends Event>(eventId: string, listener: Listener<E>): Subscription;
}

/**
 * Token for the EventStrategy interface, so code reads
 * `container.get(EventStrategy)` as PHP reads
 * `$container->get(EventStrategy::class)`. Its name is the interface
 * name, so it shares one binding with the string token 'EventStrategy'
 * that @tsnomad/loader 0.1 binds.
 *
 * Bind the in-memory strategy under both the token and its class, so
 * code that asks for either gets the same bus:
 * `container.bind(InMemoryEventStrategy, EventStrategy, InMemoryEventStrategy)`.
 */
export const EventStrategy = createToken<EventStrategy>('EventStrategy');
