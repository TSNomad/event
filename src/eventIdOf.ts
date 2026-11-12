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
 * the class has no static one.
 *
 * @throws TypeError, naming the class, when neither method exists, or
 *   the id is empty or is not a string
 */
export function eventIdOf(event: Event | EventClass): string {
  let id: unknown;
  let label: string;

  if (typeof event === 'function') {
    label = classLabel(event);
    const getId = (event as { getId?: unknown }).getId;
    if (typeof getId !== 'function') {
      throw new TypeError(`Event class ${label} has no static getId()`);
    }
    id = getId.call(event);
  } else {
    const ctor = ctorOf(event);
    label = classLabel(ctor);
    const staticGetId = ctor === undefined ? undefined : (ctor as { getId?: unknown }).getId;
    const instanceGetId = event === null || event === undefined
      ? undefined
      : (event as { getId?: unknown }).getId;
    if (typeof staticGetId === 'function') {
      id = staticGetId.call(ctor);
    } else if (typeof instanceGetId === 'function') {
      id = instanceGetId.call(event);
    } else {
      throw new TypeError(`Event ${label} has no static getId() and no instance getId()`);
    }
  }

  if (typeof id !== 'string' || id.length === 0) {
    throw new TypeError(`Event ${label} has an id that is not a non-empty string`);
  }
  return id;
}

/**
 * The class an event instance was built from, or undefined for a value
 * with no usable constructor, such as `Object.create(null)` or a
 * primitive with none.
 */
function ctorOf(event: unknown): Function | undefined {
  if (event === null || event === undefined) {
    return undefined;
  }
  const ctor = (event as { constructor?: unknown }).constructor;
  return typeof ctor === 'function' ? ctor : undefined;
}

/**
 * The name a TypeError uses for a class: its own name, or a stand-in
 * when it has none.
 */
function classLabel(ctor: Function | undefined): string {
  if (ctor === undefined) {
    return '(no class)';
  }
  return ctor.name !== '' ? ctor.name : '(anonymous class)';
}
