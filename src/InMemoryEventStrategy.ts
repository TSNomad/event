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

import type { Event, EventClass, EventInstance, Listener, Subscription } from './types.js';
import { DEFAULT_PRIORITY } from './EventStrategy.js';
import type { EventStrategy } from './EventStrategy.js';
import { eventIdOf } from './eventIdOf.js';

/**
 * One listener attached to one event id at one priority. A subscription
 * handle points at one registration object and removes that object
 * only. Once it has left its list, by any route, the handle finds
 * nothing to remove, even after the same listener is attached again,
 * because that makes a new registration.
 */
interface Registration {
  readonly listener: Listener<any>;
  readonly priority: number;
}

export class InMemoryEventStrategy implements EventStrategy {
  /**
   * Registrations by event id, each list ordered by priority, lowest
   * first, and by attach order within one priority. An id with no
   * registrations left has no entry.
   */
  private registrations = new Map<string, Registration[]>();

  /** See EventStrategy.broadcast. */
  async broadcast<E extends Event>(event: EventInstance<E>): Promise<void> {
    const id = InMemoryEventStrategy.broadcastIdOf(event);

    // The listeners attached now are the ones that run, whatever a
    // running listener attaches or detaches.
    const snapshot = [...(this.registrations.get(id) ?? [])];

    const errors: unknown[] = [];
    for (const registration of snapshot) {
      try {
        await registration.listener(event);
      } catch (error) {
        errors.push(error);
      }
    }

    if (errors.length > 0) {
      throw new AggregateError(errors, `${errors.length} listener(s) threw during broadcast of '${id}'`);
    }
  }

  /** See EventStrategy.attach. */
  attach<E extends Event>(event: EventClass<E>, action: Listener<NoInfer<E>>, priority?: number): void;
  attach<E extends Event = Event>(eventId: string, action: Listener<E>, priority?: number): void;
  attach(event: EventClass | string, action: Listener<any>, priority?: number): void {
    this.register(InMemoryEventStrategy.idOf(event), action, InMemoryEventStrategy.priorityOf(priority));
  }

  /** See EventStrategy.detach. */
  detach<E extends Event>(event: EventClass<E>, action: Listener<NoInfer<E>>, priority?: number): void;
  detach<E extends Event = Event>(eventId: string, action: Listener<E>, priority?: number): void;
  detach(event: EventClass | string, action: Listener<any>, priority?: number): void {
    const id = InMemoryEventStrategy.idOf(event);
    const at = InMemoryEventStrategy.priorityOf(priority);
    const found = this.registrations.get(id)?.find((r) => r.listener === action && r.priority === at);
    if (found) {
      this.remove(id, [found]);
    }
  }

  /**
   * Attaches at DEFAULT_PRIORITY and returns a handle whose
   * `unsubscribe()` detaches the listener at DEFAULT_PRIORITY only, as
   * `detach` with no priority does.
   *
   * The handle points at the registration this call made, or found when
   * the listener was already attached there. Two calls for one listener
   * give two handles to one registration, and either handle removes it.
   * Once that registration is gone, by any handle, `detach`,
   * `removeListener`, `clearListeners` or `clearAllListeners`, every
   * handle to it does nothing, even after the same listener is added
   * again.
   *
   * @throws TypeError when the id is empty, as every 0.1 method that
   *   takes an id does
   *
   * @deprecated Use attach and detach.
   */
  addListener<E extends Event>(eventId: string, listener: Listener<E>): Subscription {
    const id = InMemoryEventStrategy.checkedId(eventId);
    const registration = this.register(id, listener, DEFAULT_PRIORITY);
    return {
      unsubscribe: () => {
        this.remove(id, [registration]);
      },
    };
  }

  /**
   * Detaches a listener from an event at every priority.
   *
   * @throws TypeError when the id is empty
   *
   * @deprecated Use detach.
   */
  removeListener<E extends Event>(eventId: string, listener: Listener<E>): void {
    const id = InMemoryEventStrategy.checkedId(eventId);
    this.remove(id, (this.registrations.get(id) ?? []).filter((r) => r.listener === listener));
  }

  /**
   * Whether any listener is attached to the event id, at any priority.
   *
   * @throws TypeError when the id is empty
   *
   * @deprecated Kept for 0.2.x.
   */
  hasListeners(eventId: string): boolean {
    return this.registrations.has(InMemoryEventStrategy.checkedId(eventId));
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
    return this.registrations.get(InMemoryEventStrategy.checkedId(eventId))?.length ?? 0;
  }

  /**
   * Detaches every listener from one event id.
   *
   * @throws TypeError when the id is empty
   *
   * @deprecated Kept for 0.2.x.
   */
  clearListeners(eventId: string): void {
    const id = InMemoryEventStrategy.checkedId(eventId);
    this.remove(id, [...(this.registrations.get(id) ?? [])]);
  }

  /**
   * Detaches every listener from every event.
   *
   * @deprecated Kept for 0.2.x.
   */
  clearAllListeners(): void {
    for (const [id, list] of this.registrations) {
      this.remove(id, [...list]);
    }
  }

  /**
   * The ids that have at least one listener attached.
   *
   * @deprecated Kept for 0.2.x.
   */
  getEventIds(): string[] {
    return [...this.registrations.keys()];
  }

  /**
   * Adds a registration, or returns the one already there for this
   * listener at this priority. A new one goes after every registration
   * at the same or a lower priority, so a list stays in run order.
   */
  private register(id: string, listener: Listener<any>, priority: number): Registration {
    const list = this.registrations.get(id) ?? [];
    const existing = list.find((r) => r.listener === listener && r.priority === priority);
    if (existing) {
      return existing;
    }

    const registration: Registration = { listener, priority };
    const after = list.findIndex((r) => r.priority > priority);
    list.splice(after === -1 ? list.length : after, 0, registration);
    this.registrations.set(id, list);
    return registration;
  }

  /**
   * Removes registrations from an id's list, skipping any that already
   * left it. The id's entry goes too once its list is empty.
   */
  private remove(id: string, removed: readonly Registration[]): void {
    const list = this.registrations.get(id);
    if (!list) {
      return;
    }
    for (const registration of removed) {
      const at = list.indexOf(registration);
      if (at !== -1) {
        list.splice(at, 1);
      }
    }
    if (list.length === 0) {
      this.registrations.delete(id);
    }
  }

  /**
   * The id `attach` and `detach` use: a class's static id, or a string
   * used as given.
   *
   * @throws TypeError for an empty string, a class with no static id,
   *   or anything else
   */
  private static idOf(event: unknown): string {
    if (typeof event === 'function') {
      return eventIdOf(event as EventClass);
    }
    if (typeof event === 'string') {
      return InMemoryEventStrategy.checkedId(event);
    }
    throw new TypeError(`Expected an event class or an event id, got ${InMemoryEventStrategy.describe(event)}`);
  }

  /**
   * The id an event instance broadcasts under.
   *
   * @throws TypeError for an event class, naming it, because its static
   *   id would broadcast the class itself as the event, for anything that
   *   is not an object, and for an event with no id
   */
  private static broadcastIdOf(event: unknown): string {
    if (typeof event === 'function') {
      throw new TypeError(
        `broadcast takes an event instance, not the event class ${event.name || '(anonymous class)'}`
      );
    }
    if (typeof event !== 'object' || event === null) {
      throw new TypeError(`broadcast takes an event instance, got ${InMemoryEventStrategy.describe(event)}`);
    }
    return eventIdOf(event);
  }

  /**
   * @throws TypeError when the id is not a non-empty string, because no
   *   event can carry an empty id
   */
  private static checkedId(id: unknown): string {
    if (typeof id !== 'string' || id === '') {
      throw new TypeError(`An event id must be a non-empty string, got ${InMemoryEventStrategy.describe(id)}`);
    }
    return id;
  }

  /**
   * DEFAULT_PRIORITY when none is given, otherwise the priority itself.
   *
   * @throws RangeError when the priority is not an integer
   */
  private static priorityOf(priority: unknown): number {
    if (priority === undefined) {
      return DEFAULT_PRIORITY;
    }
    if (!Number.isInteger(priority)) {
      throw new RangeError(`A priority must be an integer, got ${InMemoryEventStrategy.describe(priority)}`);
    }
    return priority as number;
  }

  private static describe(value: unknown): string {
    if (typeof value === 'string') {
      return `'${value}'`;
    }
    try {
      return String(value);
    } catch {
      return typeof value;
    }
  }
}
