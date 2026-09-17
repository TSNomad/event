/**
 * TSNomad Event Strategy
 *
 * Instance-based event strategy following the observer pattern.
 * Supports both sync and async listeners with parallel execution.
 *
 * Usage:
 * ```typescript
 * class UserCreated implements Event {
 *   constructor(public readonly userId: string) {}
 *   getId(): string { return 'user.created'; }
 * }
 *
 * const events = new EventStrategy();
 *
 * events.addListener('user.created', (event) => {
 *   console.log('User created:', event.userId);
 * });
 *
 * await events.broadcast(new UserCreated('123'));
 * ```
 */

import type { Event, Listener, Subscription } from './types.js';

/**
 * Event strategy that manages listeners and broadcasts events.
 */
export class EventStrategy {
  /**
   * Listeners keyed by event ID.
   * Each event ID can have multiple listeners.
   */
  private listeners = new Map<string, Set<Listener<any>>>();

  /**
   * Adds a listener for a specific event type.
   *
   * @param eventId - The event ID to listen for
   * @param listener - Function to call when event is broadcast
   * @returns Subscription handle to unsubscribe
   */
  addListener<E extends Event>(
    eventId: string,
    listener: Listener<E>
  ): Subscription {
    let listenerSet = this.listeners.get(eventId);

    if (!listenerSet) {
      listenerSet = new Set();
      this.listeners.set(eventId, listenerSet);
    }

    listenerSet.add(listener);

    return {
      unsubscribe: () => {
        listenerSet?.delete(listener);
        // Clean up empty sets
        if (listenerSet?.size === 0) {
          this.listeners.delete(eventId);
        }
      },
    };
  }

  /**
   * Removes a specific listener for an event.
   *
   * @param eventId - The event ID
   * @param listener - The listener function to remove
   */
  removeListener<E extends Event>(
    eventId: string,
    listener: Listener<E>
  ): void {
    const listenerSet = this.listeners.get(eventId);
    if (listenerSet) {
      listenerSet.delete(listener);
      if (listenerSet.size === 0) {
        this.listeners.delete(eventId);
      }
    }
  }

  /**
   * Broadcasts an event to all registered listeners.
   * Listeners are called in parallel for performance.
   * Errors in one listener don't prevent others from executing.
   *
   * @param event - The event to broadcast (must implement Event interface)
   * @throws AggregateError if any listeners throw
   */
  async broadcast<E extends Event>(event: E): Promise<void> {
    const eventId = event.getId();
    const listenerSet = this.listeners.get(eventId);

    if (!listenerSet || listenerSet.size === 0) {
      return;
    }

    const errors: Error[] = [];
    const promises: Promise<void>[] = [];

    for (const listener of listenerSet) {
      const promise = Promise.resolve()
        .then(() => listener(event))
        .catch((error: Error) => {
          errors.push(error);
        });

      promises.push(promise);
    }

    await Promise.all(promises);

    if (errors.length > 0) {
      throw new AggregateError(
        errors,
        `${errors.length} listener(s) threw during broadcast of '${eventId}'`
      );
    }
  }

  /**
   * Checks if any listeners are registered for an event.
   *
   * @param eventId - The event ID to check
   * @returns True if at least one listener is registered
   */
  hasListeners(eventId: string): boolean {
    const listenerSet = this.listeners.get(eventId);
    return listenerSet !== undefined && listenerSet.size > 0;
  }

  /**
   * Gets the count of listeners for an event.
   *
   * @param eventId - The event ID to check
   * @returns Number of registered listeners
   */
  listenerCount(eventId: string): number {
    return this.listeners.get(eventId)?.size ?? 0;
  }

  /**
   * Removes all listeners for a specific event.
   *
   * @param eventId - The event ID to clear
   */
  clearListeners(eventId: string): void {
    this.listeners.delete(eventId);
  }

  /**
   * Removes all listeners for all events.
   */
  clearAllListeners(): void {
    this.listeners.clear();
  }

  /**
   * Gets all event IDs that have listeners.
   *
   * @returns Array of event IDs
   */
  getEventIds(): string[] {
    return Array.from(this.listeners.keys());
  }
}
