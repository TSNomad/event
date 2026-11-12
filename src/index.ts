/**
 * @tsnomad/event
 *
 * Public entry point. Re-exports the event interfaces and their tokens,
 * the in-memory strategy, and the supporting types so consumers can
 * import everything from the package root.
 */

export { EventStrategy, DEFAULT_PRIORITY } from './EventStrategy.js';
export { ActionBindingStrategy } from './ActionBindingStrategy.js';
export { InMemoryEventStrategy } from './InMemoryEventStrategy.js';
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
