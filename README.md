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
- `ActionBindingStrategy` has one method, `bindAction`, whose transformer
  is optional and may answer null. The timer and watcher methods are no
  longer on the interface.
- Broadcast runs listeners one at a time instead of in parallel.
- An empty event id, or a priority that is not an integer, throws.

## Where this differs from PHPNomad

The architecture note, `docs/architecture/ncc-slice-6.md`, keeps the
list of differences and the reason for each.

## Extracted 2026-09-17

This package was extracted on 2026-09-17 from a prototype carried inside
three Novatorius CLIs.

## License

MIT.
