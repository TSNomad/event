# @tsnomad/event

An event strategy for the observer pattern. An event is any object with a
`getId()` method. A listener subscribes to an event id, and a broadcast runs
every listener for that id in parallel, then reports any errors together
instead of stopping at the first one.

This is the TypeScript counterpart to PHPNomad's
[event](https://github.com/phpnomad/event) package, the framework that
TSNomad follows in shape and naming.

## Install

```bash
npm install @tsnomad/event
```

## Use

```ts
import { EventStrategy } from '@tsnomad/event';

const events = new EventStrategy();
events.addListener('user.created', (event) => console.log(event));
await events.broadcast({ getId: () => 'user.created' });
```

## Extracted 2026-09-17

This package was extracted on 2026-09-17 from a prototype carried inside
three Novatorius CLIs.

## License

MIT.
