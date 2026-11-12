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
 * class, and falls back to the 0.1 instance method `getId()` when the
 * class has no static one. The instance method also wins when the
 * instance's class chain declares it nearer the instance than the
 * static one, as when a 0.1 subclass declares its own `getId()` under a
 * parent with a static id. 0.1 called that method, so it keeps working.
 * When both are declared on one class, the static id wins.
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
    const useInstance = typeof instanceGetId === 'function'
      && (typeof staticGetId !== 'function' || instanceIdIsNearer(event as object, ctor as Function));
    if (useInstance) {
      id = (instanceGetId as Function).call(event);
    } else if (typeof staticGetId === 'function') {
      id = staticGetId.call(ctor);
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
 * Whether an instance's 0.1 `getId()` is declared nearer the instance
 * than its class's static `getId()`. The walk goes up the class chain
 * from `ctor`. At each class, a static `getId` declared there ends the
 * walk for the static id. Otherwise an instance `getId` declared on the
 * instance itself or on that class's prototype ends it for the instance
 * id. A static and an instance id on one class leave the static one in
 * force.
 *
 * The caller walks only when both ids resolve to functions, and the
 * first `getId` declared up either chain is the one that resolves, so
 * the walk need not check what each declaration holds.
 */
function instanceIdIsNearer(event: object, ctor: Function): boolean {
  let current: unknown = ctor;
  while (typeof current === 'function' && current !== Function.prototype) {
    if (declaresGetId(current)) {
      return false;
    }
    if (declaresGetId(event) || declaresGetId((current as { prototype?: unknown }).prototype)) {
      return true;
    }
    current = Object.getPrototypeOf(current);
  }
  return false;
}

/**
 * Whether a value declares `getId` as its own property. A function with
 * no prototype, such as an arrow function in a class chain, hands this
 * undefined, and a prototype set to null hands it null.
 */
function declaresGetId(value: unknown): boolean {
  return value != null && Object.hasOwn(value, 'getId');
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
