/**
 * @tsnomad/event
 *
 * Public entry point. Re-exports the event strategy and its supporting
 * types so consumers can import everything from the package root.
 */

export { EventStrategy } from './EventStrategy.js';
export type {
  Event,
  CanHandle,
  Listener,
  Transformer,
  Subscription,
  EventBinding,
  ActionBinding,
  ExternalEventBinding,
  ActionBindingStrategy,
  WatchOptions,
} from './types.js';
