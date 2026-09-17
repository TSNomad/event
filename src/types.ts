/**
 * TSNomad Events Types
 *
 * Event system following the observer pattern.
 * Events are classes with a getId() method that returns the event identifier.
 */

/**
 * Base interface for all events.
 * Events must implement getId() to identify the event type.
 *
 * @example
 * ```typescript
 * class UserCreated implements Event {
 *   constructor(public readonly userId: string) {}
 *
 *   getId(): string {
 *     return 'user.created';
 *   }
 * }
 * ```
 */
export interface Event {
  /**
   * Returns the unique identifier for this event type.
   * Convention: 'domain.action' e.g., 'milestone.created', 'worker.started'
   */
  getId(): string;
}

/**
 * Handler that processes an event.
 * Implements CanHandle pattern from PHPNomad.
 */
export interface CanHandle<E extends Event = Event> {
  /**
   * Handles the event.
   * Can be sync or async.
   */
  handle(event: E): void | Promise<void>;
}

/**
 * Listener function that handles an event.
 * Can be sync or async.
 */
export type Listener<E extends Event> = (event: E) => void | Promise<void>;

/**
 * Transformer function that converts input data into an event.
 * Useful for creating events from external data sources.
 */
export type Transformer<TInput, E extends Event> = (input: TInput) => E;

/**
 * Subscription handle returned when adding a listener.
 * Call unsubscribe() to remove the listener.
 */
export interface Subscription {
  /**
   * Removes the listener from the strategy.
   */
  unsubscribe(): void;
}

/**
 * Event binding configuration for initializers.
 */
export interface EventBinding<E extends Event = Event> {
  /**
   * Event ID to listen for.
   */
  eventId: string;

  /**
   * Listener function to call.
   */
  listener: Listener<E>;
}

/**
 * Configuration for an external action binding.
 * Maps a platform action (e.g., 'chokidar:change') to a nomadic event.
 */
export interface ActionBinding<TInput = unknown, E extends Event = Event> {
  /**
   * The external action identifier.
   * Format: 'source:action' e.g., 'chokidar:change', 'interval:tick', 'process:sigint'
   */
  action: string;

  /**
   * Transformer that converts the external input into a nomadic event.
   */
  transformer: Transformer<TInput, E>;
}

/**
 * External action binding configuration returned by initializers.
 * Maps a nomadic event class to external triggers.
 */
export interface ExternalEventBinding<E extends Event = Event> {
  /**
   * The nomadic event ID this binding produces.
   */
  eventId: string;

  /**
   * External action bindings that trigger this event.
   */
  bindings: ActionBinding<unknown, E>[];
}

/**
 * Strategy interface for binding external platform actions to nomadic events.
 * Platform-specific implementations (Node.js, browser, etc.) implement this.
 */
export interface ActionBindingStrategy {
  /**
   * Register an external action binding.
   * When the external action fires, the transformer creates a nomadic event
   * which is then broadcast through the EventStrategy.
   *
   * @param eventId The nomadic event ID to produce
   * @param action The external action to listen for (e.g., 'chokidar:change')
   * @param transformer Function to transform external data into an event
   */
  bindAction<TInput, E extends Event>(
    eventId: string,
    action: string,
    transformer: Transformer<TInput, E>
  ): void;

  /**
   * Register a timer/interval that fires events periodically.
   *
   * @param name Unique name for this timer
   * @param intervalMs Interval in milliseconds
   * @param eventId The nomadic event ID to produce
   * @param transformer Function to create the event on each tick
   */
  registerInterval<E extends Event>(
    name: string,
    intervalMs: number,
    eventId: string,
    transformer: () => E
  ): void;

  /**
   * Unregister a timer/interval.
   */
  clearInterval(name: string): void;

  /**
   * Start watching a file or directory.
   *
   * @param path Path to watch
   * @param options Watch options
   */
  watchPath(path: string, options?: WatchOptions): void;

  /**
   * Stop watching a path.
   */
  unwatchPath(path: string): void;

  /**
   * Stop all watchers and timers, cleanup resources.
   */
  dispose(): Promise<void>;
}

/**
 * Options for file/directory watching.
 */
export interface WatchOptions {
  /**
   * Glob patterns to match (default: all files)
   */
  patterns?: string[];

  /**
   * Whether to watch subdirectories (default: true)
   */
  recursive?: boolean;

  /**
   * Ignore patterns
   */
  ignore?: string[];

  /**
   * Whether to fire events for existing files on start (default: false)
   */
  fireOnStart?: boolean;
}
