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
the interface's name: `await container.get(EventStrategy)`.

## Upgrading from 0.1

`EventStrategy` is now the interface. Write `new InMemoryEventStrategy()`
where 0.1 code wrote `new EventStrategy()`. The 0.1 methods, such as
`addListener`, still work on `InMemoryEventStrategy` and are deprecated.

## Where this differs from PHPNomad

- `broadcast` returns a promise and listeners may be async.
- Every listener runs even when one throws, then one `AggregateError`
  carries every error.
- `HasListeners` keys by event id, and `HasEventBindings` returns
  `[EventClass, actions]` pairs, because an object key cannot be a class.
- An interface is a typed token with the interface's name, because
  TypeScript erases interfaces.

## Extracted 2026-09-17

This package was extracted on 2026-09-17 from a prototype carried inside
three Novatorius CLIs.

## License

MIT.
