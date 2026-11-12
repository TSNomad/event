/**
 * TSNomad Events Types
 *
 * Event system following the observer pattern, the TypeScript
 * counterpart of PHPNomad's event package. Events are classes with a
 * static getId() that returns the event identifier.
 */

/**
 * Marker interface for events, PHPNomad's
 * `PHPNomad\Events\Interfaces\Event`.
 *
 * PHPNomad declares `public static function getId(): string` on this
 * interface. A TypeScript interface cannot declare a static member, so
 * the static id is carried by `EventClass` instead, and every event
 * class declares it:
 *
 * @example
 * ```typescript
 * class UserCreated implements Event {
 *   static getId(): string {
 *     return 'user.created';
 *   }
 *
 *   constructor(public readonly userId: string) {}
 * }
 * ```
 *
 * An event that only has the 0.1 instance method, `getId(): string`,
 * still broadcasts, through `eventIdOf`. That path is deprecated and
 * stays for 0.2.x.
 */
export interface Event {}

/**
 * An event class, the TypeScript stand-in for PHP's `Event::class`: a
 * class whose instances are `E` and whose static `getId()` names the
 * event.
 */
export type EventClass<E extends Event = Event> = (abstract new (...args: any[]) => E) & {
  getId(): string;
};

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
 * A class whose instances handle `E`. The loader resolves it from the
 * container, with its `inject` list, and calls `handle()`, as
 * PHPNomad's loader does with `$container->get($handler)->handle($event)`.
 */
export type HandlerClass<E extends Event = any> = abstract new (...args: any[]) => CanHandle<E>;

/**
 * One listener for an event: a handler class, or a plain function.
 */
export type ListenerEntry<E extends Event = any> = HandlerClass<E> | Listener<E>;

/**
 * PHPNomad's `PHPNomad\Events\Interfaces\HasListeners`. An initializer
 * that listens for events returns a map from event id to one handler or
 * a list of them.
 *
 * Where this differs from PHPNomad: the key is the event id, such as
 * `[UserCreated.getId()]`, because a TypeScript object key cannot be a
 * class.
 */
export interface HasListeners {
  getListeners(): Record<string, ListenerEntry | readonly ListenerEntry[]>;
}

/**
 * Turns the arguments a platform action passes into an event. Answering
 * null or undefined raises no event, per event-binding (KB 45).
 */
export type ActionTransformer<E extends Event = Event> = (
  ...args: any[]
) => E | null | undefined | Promise<E | null | undefined>;

/**
 * One platform action bound to an event, PHPNomad's
 * `['action' => ..., 'transformer' => ...]`. With no transformer, the
 * strategy builds the event class from the action's arguments.
 */
export interface EventBindingAction<E extends Event = Event> {
  action: string;
  transformer?: ActionTransformer<E>;
}

/**
 * One entry of `getEventBindings()`: an event class and the platform
 * actions that raise it. An action given as a bare string has no
 * transformer.
 */
export type EventBindingDefinition<E extends Event = any> = readonly [
  EventClass<E>,
  string | EventBindingAction<E> | readonly (string | EventBindingAction<E>)[],
];

/**
 * PHPNomad's `PHPNomad\Events\Interfaces\HasEventBindings`. The loader
 * hands each action to `ActionBindingStrategy.bindAction`.
 *
 * Where this differs from PHPNomad: the result is a list of
 * `[EventClass, actions]` pairs, because a TypeScript object key cannot
 * be a class.
 */
export interface HasEventBindings {
  getEventBindings(): readonly EventBindingDefinition[];
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
 * Event binding configuration for initializers, the 0.1 shape.
 *
 * @deprecated The loader still reads it as a plain listener. New code
 * uses `HasListeners`.
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
 * Options for file/directory watching.
 *
 * @deprecated A Node platform concern that 0.1 put on
 * ActionBindingStrategy. Kept as a type for 0.2.x.
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
