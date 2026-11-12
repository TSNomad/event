/**
 * Event id resolution, in one place, so every strategy and the loader
 * read an event's id the same way.
 */

import type { Event, EventClass } from './types.js';

/**
 * Returns an event's id.
 *
 * Given an event class, it calls the class's static `getId()`. Given an
 * event instance, it calls the static `getId()` on the instance's
 * class, and falls back to the 0.1 instance method `getId()` only when
 * the class has no static one. The static id wins when both exist.
 *
 * @throws TypeError, naming the class, when neither exists or the id is
 *   not a non-empty string
 */
export function eventIdOf(event: Event | EventClass): string {
  // Stub: not implemented yet. See docs/architecture/ncc-slice-6.md.
  void event;
  return '';
}
