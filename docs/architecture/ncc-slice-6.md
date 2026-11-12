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

container.bind(InMemoryEventStrategy, EventStrategy, InMemoryEventStrategy);

const events = await container.get(EventStrategy);
events.attach(UserCreated, (event) => welcome(event.userId));  // priority 10
events.attach(UserCreated, audit, 5);                          // runs first
await events.broadcast(new UserCreated('123'));
events.detach(UserCreated, audit, 5);
```

- `broadcast(event)` runs the listeners for the event's id one at a
  time, lowest priority number first, attach order within a priority.
  Every listener runs. If any threw, broadcast rejects with one
  `AggregateError` that holds each error, unchanged, in run order, so
  one failing listener never stops the outbox listener. Its message
  names the count and the event id. The listeners that run are those
  attached when broadcast started. The strategy runs each listener once
  per broadcast and never retries.
- `attach(event, action, priority = 10)` takes an event class or an id.
  An id string is used as given and must not be empty. A priority is an
  integer, as PHPNomad's `?int` is. The same listener at the same
  priority is registered once.
- `detach(event, action, priority = 10)` removes the listener's
  registration at that one priority, as PHPNomad's WordPress strategy
  passes 10 to `remove_action` when no priority is given. Detaching what
  is not attached there does nothing.
- An empty id throws a `TypeError`, and a priority that is not an
  integer throws a `RangeError`, from both `attach` and `detach`.

Event ids become static, `static getId()`, as in PHPNomad. `EventClass<E>`
stands in for `Event::class`. `eventIdOf(eventOrClass)` is the one place
that reads an id. It reads the static id, falls back to the 0.1
instance `getId()`, and throws a `TypeError` naming the class when there
is neither, or the id is empty or is not a string. `Event` becomes a
marker interface, because a TypeScript interface cannot declare a static
member.

`InMemoryEventStrategy` is the concrete strategy this package ships. It
implements the interface and carries the deprecated 0.1 methods:
`addListener` (priority 10, returns a `Subscription`), `removeListener`
(every priority), `hasListeners`, `listenerCount`, `clearListeners`,
`clearAllListeners` and `getEventIds`. A subscription's `unsubscribe()`
removes the priority 10 registration only, and a second call does
nothing, even after the same listener was added again. Bind it under
both the token and its class, as above. A binding that leaves the class
out lets `get(InMemoryEventStrategy)` autowire a second bus that hears
nothing.

`ActionBindingStrategy` becomes PHPNomad's one-method interface,
`bindAction(eventClass, action, transformer?)`, with a token. A
transformer answering null raises no event, and its type rejects a
transformer that forgets to return. Failures go back to the platform:
the callback a strategy registers returns or awaits the transformer and
the broadcast, so a throwing transformer and a broadcast's
`AggregateError` both reach the platform's caller. The strategy never
swallows them and never retries. A platform that reruns a failed action
reruns every listener, so listeners must tolerate a second run, and work
that must survive a failure goes through the outbox to the durable
queue.

New types for initializers: `CanHandle`, `HandlerClass`,
`ListenerEntry`, `HasListeners`, `ActionTransformer`,
`EventBindingAction`, `EventBindingDefinition` and `HasEventBindings`.
The loader reads them in slice 7. The 0.1 `EventBinding`,
`ActionBinding`, `ExternalEventBinding`, `Transformer`, `Listener` and
`WatchOptions` types stay.

The tokens carry the interface names, `'EventStrategy'` and
`'ActionBindingStrategy'`, the convention the container's typed tokens
set. A typed token shares a binding with a string token of the same
name, so `container.get(EventStrategy)` finds the strategy that
`@tsnomad/loader` 0.1 binds under the string `'EventStrategy'`.

The package depends on `@tsnomad/di-container` for `createToken`. On
this branch the dependency names the container's slice branch, so the
tests run against the 0.2.0 container. When the two pull requests merge
into `feat/node-commerce-connectors`, the dependency moves to that
branch, and when that branch merges to main it drops the ref, as the
loader declares it, so one copy of the container serves both.

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
- `ActionBindingStrategy` has one method. `registerInterval`,
  `clearInterval`, `watchPath`, `unwatchPath` and `dispose` are gone
  from the interface. A class that implements it keeps those methods as
  its own, and code that called them through the interface type uses
  the class type. Its `bindAction` must accept an optional transformer
  that may answer null, where 0.1 required one.
- Broadcast runs listeners one at a time instead of in parallel. Code
  that relied on two slow listeners overlapping takes longer.
- `detach` and the 0.2 `attach` throw on an empty id or a priority that
  is not an integer, where 0.1 accepted anything.

The version moves to 0.2.0 for these breaks.

A build-only run of the five current consumers against the stub commits
found exactly these breaks: two consumers call `new EventStrategy()`,
and one implements the 0.1 `bindAction` shape. Each fix is the one
listed above.

## Where this differs from PHPNomad

- `broadcast` returns a promise and listeners may be async.
- A failing listener does not stop the rest. One `AggregateError` comes
  back after all have run.
- Broadcast runs the listeners attached when it started. WordPress hooks
  see an attach or detach made by a running listener.
- `HasListeners` keys by event id and `HasEventBindings` returns
  `[EventClass, actions]` pairs, because an object key cannot be a class.
- A `ListenerEntry` may be a plain function as well as a `CanHandle`
  class, because 0.1 listeners are functions.
- `ActionBindingStrategy.bindAction` also accepts a string event id, for
  0.1 implementations. It then needs a transformer.
- The 0.1 instance `getId()` still works through `eventIdOf`.
- `@tsnomad/loader` 0.1 exports its own `HasListeners` and
  `HasEventBindings` with other shapes, and `HasEventBindings` there
  means something else. The ones in this package are the PHPNomad
  shapes. The loader's copies leave in slice 7, and until then code
  imports these from `@tsnomad/event`.

## Files

| File | Role | State |
|---|---|---|
| `src/types.ts` | `Event`, `EventClass`, handler and binding types | final |
| `src/EventStrategy.ts` | the interface, its token and `DEFAULT_PRIORITY` | final |
| `src/ActionBindingStrategy.ts` | the interface and its token | final |
| `src/eventIdOf.ts` | id resolution | stubbed, returns `''` |
| `src/InMemoryEventStrategy.ts` | the in-memory strategy | stubbed, every method a no-op returning an empty value |

The stubs return a valid value of the declared type and never throw.
`eventIdOf` returns `''`, a value its contract forbids, because any real
id would be a guess. It is the one tolerated placeholder.

## Acceptance tests

| File | Tests | What it proves |
|---|---|---|
| `test/broadcast-priority.test.ts` | 12 | attach by class and by id, priority order and the default of 10, attach order within a priority, one listener at a time, dedupe at one priority, one run per priority, attach and detach during a broadcast |
| `test/broadcast-errors.test.ts` | 4 | every listener runs past failures, one `AggregateError` with errors in run order and a message naming the count and id, rejection only after the last listener settles |
| `test/detach.test.ts` | 7 | detach at one priority and at the default, detaching what is not attached, the empty id and non-integer priority errors |
| `test/event-ids.test.ts` | 8 | `eventIdOf` for classes and instances, the 0.1 fallback, the static id winning, the `TypeError` cases, and their effect on broadcast and attach |
| `test/legacy-listeners.test.ts` | 7 | each deprecated 0.1 method, and what `unsubscribe` removes |
| `test/event-strategy-token.test.ts` | 3 | integration shape: the token names, a 0.1 string binding found through the token, and the documented class binding giving one shared bus through a real container |
| `test/event-type-safety.ts` | 5 rejected calls | compile-only: inferred listener types, static ids required by `EventClass`, priority type, transformer return types, the documented binding compiling |

That is 41 runtime tests. The token-name test carries no marker,
because the tokens are final. The shared-bus test also needs the
container's class `bind`, so it passes once both packets land.
`test/fixtures.ts` holds the event classes the tests share. `npm test`
builds and runs every file. `npm run typecheck` checks the compile-only
file.

## Proof

The record is in `docs/architecture/ncc-slice-6-proof/`: the two
harnesses, the mutation lists and their logs.

A scratch implementation in a separate clone passed all 41 runtime
tests, against a scratch container that passed the container's tests.
The clone is thrown away and never committed. Each guard then got its
own mutation, and the harness scored 44 of them, each building cleanly
and turning the suite red at the expected tests. Each run started with
three controls: a break it must catch, a comment it must not, and a
syntax error it must refuse to score. The harness refuses a mutation
whose build fails, so a compile break never counts as a kill, and the
mutations it refused in earlier rounds were rewritten until they
compiled. One mutation in
the scratch container showed the shared-bus test going red from the
container side. The type harness loosened the signature behind each of
the five `@ts-expect-error` lines, and each loosening left exactly its
directive unused, with the same three controls.

## Consumer check

The container repository's `scripts/consumer-check.sh` builds and tests
the five current consumers against both branches in throwaway clones.
The container note gives the pass rule. A consumer that stops compiling
because of the breaks above passes with a fix patch that applies only
the fixes listed there, and the report names each patch.
