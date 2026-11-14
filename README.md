# @tsnomad/event

Event contracts in PHPNomad's shape, with an in-memory strategy. An event
class names itself with a static `getId()`. Listeners attach with a
priority, and a broadcast runs them one at a time, lowest number first,
then reports any errors together instead of stopping at the first one.

This is the TypeScript counterpart to PHPNomad's
[event](https://github.com/phpnomad/event) package, the framework that
TSNomad follows in shape and naming.

## Install

```bash
npm install @tsnomad/event
```

## Use

```ts
import { InMemoryEventStrategy, type Event } from '@tsnomad/event';

class UserCreated implements Event {
  static getId(): string { return 'user.created'; }
  constructor(readonly userId: string) {}
}

const events = new InMemoryEventStrategy();
events.attach(UserCreated, (event) => console.log(event.userId));
events.attach(UserCreated, audit, 5); // runs before priority 10
await events.broadcast(new UserCreated('123'));
```

Code that depends on the contract resolves `EventStrategy`, a token with
the interface's name. Bind the in-memory strategy under the token and its
class, so both resolve to one bus:

```ts
container.bind(InMemoryEventStrategy, EventStrategy, InMemoryEventStrategy);
const events = await container.get(EventStrategy);
```

## Upgrading from 0.1

- Write `new InMemoryEventStrategy()` where 0.1 code wrote
  `new EventStrategy()`. `EventStrategy` is now the interface and its
  token.
- The 0.1 listener methods, such as `addListener` and `listenerCount`,
  still work on `InMemoryEventStrategy` and are deprecated. Only
  `addListener` stays on the interface.
- `ActionBindingStrategy` has one method, `bindAction`. Bound to an
  event class, its transformer is optional. Bound to an id, as in 0.1, it
  is required. A transformer answers an event or null, and an
  implementation throws on any other answer. The timer and watcher
  methods are no longer on the interface.
- Broadcast runs listeners one at a time instead of in parallel.
- An empty event id, or a priority that is not an integer, throws, from
  the 0.1 methods too.
- A listener may run more than once for the same event: once per
  priority it is attached at, and again when a broadcast is repeated
  after a failure. Work that must happen once keys its idempotency on
  the event's own data, such as an order id, not on the event id, which
  every event of that type shares. Dedupe at the write in one atomic
  step, such as an insert a unique key refuses.

## Where this differs from PHPNomad

- `broadcast` is async, returns a promise and awaits each listener in
  turn. PHPNomad is synchronous. Node's I/O forces this one.
- A failing listener does not stop the rest. One `AggregateError` comes
  back after every listener has run.
- Event ids are static, as in PHPNomad, but an `EventStrategy` token
  stands in for the interface, because TypeScript erases interfaces.
  Tokens carry the bare interface name, `'EventStrategy'`, not a
  namespaced one.
- `attach` and `detach` also take an event id string, for 0.1 callers.
  A `null` priority throws, where PHPNomad maps it to 10.
- `HasListeners` keys by event id and `HasEventBindings` returns
  `[EventClass, actions]` pairs, because an object key cannot be a
  class. A bare action string binds with no transformer, as PHPNomad's
  loader reads it.
- A transformer answers an event or null, and any other answer throws.
- PHPNomad's event package holds only interfaces. `InMemoryEventStrategy`
  ships here for now and moves to `@tsnomad/node-integration` when that
  package ships. A deprecated re-export then stays here until this
  package's next breaking release, so switch the import once, when you
  choose.

The architecture note, `docs/architecture/ncc-slice-6.md`, gives the
reason for each and the full list.

## Extracted 2026-09-17

This package was extracted on 2026-09-17 from a prototype carried inside
three Novatorius CLIs.

## License

MIT.
