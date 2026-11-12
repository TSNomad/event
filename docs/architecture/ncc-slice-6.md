# Event reshape toward PHPNomad

Status: architecture phase. Stubs and acceptance tests are committed.
The acceptance tests are marked `test.skip` until each packet lands.

This is slice 6 of the Siren Node commerce connectors build, the event
half. The container half lives in the di-container repository, in its
own `docs/architecture/ncc-slice-6.md`, on the branch of the same name.
The design behind both is
[Design: Siren Node commerce connectors (Source 16182)](https://navigator.novatori.us/r/source/16182),
section 2, and the rule both follow is
[TS Nomad Mirrors PHPNomad (KB 854)](https://navigator.novatori.us/r/kb/854).

## What changes

`EventStrategy` becomes PHPNomad's interface, with a same-named token.

```ts
class UserCreated implements Event {
  static getId(): string { return 'user.created'; }
  constructor(public readonly userId: string) {}
}

const events = await container.get(EventStrategy);
events.attach(UserCreated, (event) => welcome(event.userId));  // priority 10
events.attach(UserCreated, audit, 5);                          // runs first
await events.broadcast(new UserCreated('123'));
events.detach(UserCreated, audit, 5);
```

- `broadcast(event)` runs the listeners for the event's id one at a
  time, lowest priority number first, attach order within a priority.
  Every listener runs. If any threw, broadcast rejects with one
  `AggregateError` holding each error in run order, so one failing
  listener never stops the outbox listener (A30). The listeners that run
  are those attached when broadcast started.
- `attach(event, action, priority = 10)` takes an event class or an id.
  The same listener at the same priority is registered once.
- `detach(event, action, priority?)` removes one priority's registration,
  or every priority's when none is given. Detaching what is not attached
  does nothing.

Event ids become static, `static getId()`, as in PHPNomad. `EventClass<E>`
stands in for `Event::class`. `eventIdOf(eventOrClass)` is the one place
that reads an id. It prefers the static id, falls back to the 0.1
instance `getId()`, and throws a `TypeError` naming the class when there
is neither or the id is not a non-empty string. `Event` becomes a marker
interface, because a TypeScript interface cannot declare a static member.

The 0.1 concrete class becomes `InMemoryEventStrategy`. It implements
the interface and keeps the 0.1 methods, deprecated: `addListener`
(priority 10, returns a `Subscription`), `removeListener`,
`hasListeners`, `listenerCount`, `clearListeners`, `clearAllListeners`
and `getEventIds`. It stays in this package. The five current consumers
can only install public packages, and the planned Node integration
package lives in a private repository, so that package re-exports this
class instead of owning it.

`ActionBindingStrategy` becomes PHPNomad's one-method interface,
`bindAction(eventClass, action, transformer?)`, with a token. A
transformer answering null or undefined raises no event. The Node timer
and watcher methods leave the interface. `WatchOptions` stays as a type.

New types for initializers: `CanHandle` (kept), `HandlerClass`,
`ListenerEntry`, `HasListeners`, `ActionTransformer`,
`EventBindingAction`, `EventBindingDefinition` and `HasEventBindings`.
The loader reads them in slice 7. The 0.1 `EventBinding`, `ActionBinding`,
`ExternalEventBinding`, `Transformer` and `Listener` types stay.

The package now depends on `@tsnomad/di-container` for `createToken`,
declared the same way the loader declares it, so one copy of the
container serves both.

## Why `addListener` stays on the interface

`@tsnomad/loader` 0.1 calls `events.addListener` through the
`EventStrategy` type, and every consumer builds the loader from source
on install. Without `addListener` on the interface, the loader's build
fails and so does every consumer's install. It is marked deprecated and
leaves once slice 7 moves the loader to `attach`.

## What breaks for 0.1 callers, and the fix

- `new EventStrategy()` no longer compiles, because `EventStrategy` is a
  token. Write `new InMemoryEventStrategy()`.
- A variable typed `EventStrategy` that calls a 0.1 method other than
  `addListener`, such as `listenerCount`, needs the type
  `InMemoryEventStrategy`.
- A class that implements `ActionBindingStrategy` with the 0.1 signature
  `bindAction(eventId: string, action, transformer: Transformer)` no
  longer satisfies it. The transformer is optional now and may answer
  null, so the implementation must accept both.
- Broadcast runs listeners one at a time instead of in parallel. Code
  that relied on two slow listeners overlapping takes longer.

The version moves to 0.2.0 for these breaks (A28).

## Where this differs from PHPNomad

- `broadcast` returns a promise and listeners may be async.
- A failing listener does not stop the rest. One `AggregateError` comes
  back after all have run.
- `HasListeners` keys by event id and `HasEventBindings` returns
  `[EventClass, actions]` pairs, because an object key cannot be a class.
- `ActionBindingStrategy.bindAction` also accepts a string event id, for
  0.1 implementations. It then needs a transformer.
- The 0.1 instance `getId()` still works through `eventIdOf`.

## Files

| File | Role | State |
|---|---|---|
| `src/types.ts` | `Event`, `EventClass`, handler and binding types | final |
| `src/EventStrategy.ts` | the interface, its token and `DEFAULT_PRIORITY` | final |
| `src/ActionBindingStrategy.ts` | the interface and its token | final |
| `src/eventIdOf.ts` | id resolution | stubbed, returns `''` |
| `src/InMemoryEventStrategy.ts` | the in-memory strategy | stubbed, every method a no-op returning an empty value |

## Acceptance tests

| File | What it proves |
|---|---|
| `test/broadcast-priority.test.ts` | attach by class and by id, priority order and the default of 10, attach order within a priority, one listener at a time, dedupe at one priority, one run per priority, attach and detach during a broadcast |
| `test/broadcast-errors.test.ts` | every listener runs past failures, one `AggregateError` with errors in run order and a message naming the count and id, rejection only after the last listener settles |
| `test/detach.test.ts` | detach with and without a priority, detaching what is not attached |
| `test/event-ids.test.ts` | `eventIdOf` for classes and instances, the 0.1 fallback, the static id winning, the `TypeError` cases, and their effect on broadcast and attach |
| `test/legacy-listeners.test.ts` | each deprecated 0.1 method on `InMemoryEventStrategy` |
| `test/event-strategy-token.test.ts` | integration shape: the token resolves a shared strategy through a real container, and the token names |
| `test/event-type-safety.ts` | compile-only: inferred listener types, static ids required by `EventClass`, priority type, initializer shapes, transformer return types |

`test/fixtures.ts` holds the event classes the tests share. `npm test`
builds and runs every file. `npm run typecheck` checks the compile-only
file. The token-name test carries no marker, because the tokens are
final.

## Consumer check

The container repository's `scripts/consumer-check.sh` builds and tests
the five current consumers against both branches in throwaway clones.
The slice is done when that check passes. The breaks listed above are
the ones the stubs already show at compile time.
