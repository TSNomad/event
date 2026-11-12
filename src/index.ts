/**
 * @tsnomad/event
 *
 * Public entry point. Re-exports the event interfaces and their tokens,
 * the in-memory strategy, and the supporting types so consumers can
 * import everything from the package root. The root export of the
 * in-memory strategy is deprecated, see its note below.
 */

export { EventStrategy, DEFAULT_PRIORITY } from './EventStrategy.js';
export { ActionBindingStrategy } from './ActionBindingStrategy.js';
import { InMemoryEventStrategy as InMemoryEventStrategyClass } from './InMemoryEventStrategy.js';

/**
 * The in-memory event strategy, kept at the package root for existing
 * imports.
 *
 * @deprecated Import `InMemoryEventStrategy` from `@tsnomad/node-integration`,
 * or from this package's `./in-memory-event-strategy` subpath. The root
 * export goes away at the next breaking release.
 */
export const InMemoryEventStrategy = InMemoryEventStrategyClass;

/**
 * The in-memory event strategy's instance type, kept at the package root
 * for existing imports.
 *
 * @deprecated Import `InMemoryEventStrategy` from `@tsnomad/node-integration`,
 * or from this package's `./in-memory-event-strategy` subpath. The root
 * export goes away at the next breaking release.
 */
export type InMemoryEventStrategy = InMemoryEventStrategyClass;
export { eventIdOf } from './eventIdOf.js';
export type {
  Event,
  EventClass,
  CanHandle,
  HandlerClass,
  ListenerEntry,
  HasListeners,
  ActionTransformer,
  NotThenable,
  EventInstance,
  EventBindingAction,
  EventBindingDefinition,
  HasEventBindings,
  Listener,
  Transformer,
  Subscription,
  EventBinding,
  ActionBinding,
  ExternalEventBinding,
  WatchOptions,
} from './types.js';
