/**
 * InMemoryEventStrategy
 *
 * An EventStrategy that keeps its listeners in memory, in one process.
 * It also carries the deprecated 0.1 listener methods.
 *
 * Usage:
 * ```typescript
 * class UserCreated implements Event {
 *   static getId(): string { return 'user.created'; }
 *   constructor(public readonly userId: string) {}
 * }
 *
 * const events = new InMemoryEventStrategy();
 * events.attach(UserCreated, (event) => console.log(event.userId));
 * events.attach(UserCreated, audit, 5); // runs first
 *
 * await events.broadcast(new UserCreated('123'));
 * ```
 *
 * In a container, bind it under the interface token and its own class,
 * so a `get` of either returns the same instance:
 * `container.bind(InMemoryEventStrategy, EventStrategy, InMemoryEventStrategy)`.
 * Without its class in that call, `get(InMemoryEventStrategy)` autowires
 * a second, separate bus.
 */

import type { Event, EventClass, Listener, Subscription } from './types.js';
import type { EventStrategy } from './EventStrategy.js';

export class InMemoryEventStrategy implements EventStrategy {
  /** See EventStrategy.broadcast. */
  async broadcast<E extends Event>(event: E): Promise<void> {
    // Stub: not implemented yet. See docs/architecture/ncc-slice-6.md.
    void event;
  }

  /** See EventStrategy.attach. */
  attach<E extends Event>(event: EventClass<E>, action: Listener<NoInfer<E>>, priority?: number): void;
  attach<E extends Event = Event>(eventId: string, action: Listener<E>, priority?: number): void;
  attach(event: EventClass | string, action: Listener<any>, priority?: number): void {
    // Stub: not implemented yet.
    void event;
    void action;
    void priority;
  }

  /** See EventStrategy.detach. */
  detach<E extends Event>(event: EventClass<E>, action: Listener<NoInfer<E>>, priority?: number): void;
  detach<E extends Event = Event>(eventId: string, action: Listener<E>, priority?: number): void;
  detach(event: EventClass | string, action: Listener<any>, priority?: number): void {
    // Stub: not implemented yet.
    void event;
    void action;
    void priority;
  }

  /**
   * Attaches at DEFAULT_PRIORITY and returns a handle whose
   * `unsubscribe()` detaches the listener at DEFAULT_PRIORITY only, as
   * `detach` with no priority does.
   *
   * The handle points at the registration this call made, or found when
   * the listener was already attached there. Two calls for one listener
   * give two handles to one registration, and either handle removes it.
   * Once that registration is gone, by any handle, `detach` or
   * `removeListener`, every handle to it does nothing, even after the
   * same listener is added again.
   *
   * @throws TypeError when the id is empty, as every 0.1 method that
   *   takes an id does
   *
   * @deprecated Use attach and detach.
   */
  addListener<E extends Event>(eventId: string, listener: Listener<E>): Subscription {
    // Stub: not implemented yet.
    void eventId;
    void listener;
    return { unsubscribe: () => {} };
  }

  /**
   * Detaches a listener from an event at every priority.
   *
   * @throws TypeError when the id is empty
   *
   * @deprecated Use detach.
   */
  removeListener<E extends Event>(eventId: string, listener: Listener<E>): void {
    // Stub: not implemented yet.
    void eventId;
    void listener;
  }

  /**
   * Whether any listener is attached to the event id, at any priority.
   *
   * @throws TypeError when the id is empty
   *
   * @deprecated Kept for 0.2.x.
   */
  hasListeners(eventId: string): boolean {
    // Stub: not implemented yet.
    void eventId;
    return false;
  }

  /**
   * How many registrations the event id has, counting one per listener
   * per priority.
   *
   * @throws TypeError when the id is empty
   *
   * @deprecated Kept for 0.2.x.
   */
  listenerCount(eventId: string): number {
    // Stub: not implemented yet.
    void eventId;
    return 0;
  }

  /**
   * Detaches every listener from one event id.
   *
   * @throws TypeError when the id is empty
   *
   * @deprecated Kept for 0.2.x.
   */
  clearListeners(eventId: string): void {
    // Stub: not implemented yet.
    void eventId;
  }

  /**
   * Detaches every listener from every event.
   *
   * @deprecated Kept for 0.2.x.
   */
  clearAllListeners(): void {
    // Stub: not implemented yet.
  }

  /**
   * The ids that have at least one listener attached.
   *
   * @deprecated Kept for 0.2.x.
   */
  getEventIds(): string[] {
    // Stub: not implemented yet.
    return [];
  }
}
