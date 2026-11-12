/**
 * Acceptance tests: attach with priority and one-at-a-time broadcast on
 * InMemoryEventStrategy. See docs/architecture/ncc-slice-6.md.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryEventStrategy } from '../dist/InMemoryEventStrategy.js';
import { DEFAULT_PRIORITY } from '../dist/EventStrategy.js';
import { UserCreated, OrderPlaced, tick } from './fixtures.ts';

test('a listener attached by event class receives the broadcast event', async () => {
  const events = new InMemoryEventStrategy();
  const seen: string[] = [];
  events.attach(UserCreated, (event) => {
    seen.push(event.userId);
  });

  await events.broadcast(new UserCreated('u1'));

  assert.deepEqual(seen, ['u1']);
});

test('a listener attached by id string receives the event whose static id matches', async () => {
  const events = new InMemoryEventStrategy();
  const seen: string[] = [];
  events.attach<UserCreated>('user.created', (event) => {
    seen.push(event.userId);
  });

  await events.broadcast(new UserCreated('u2'));

  assert.deepEqual(seen, ['u2']);
});

test('a broadcast reaches only the listeners of its own event id', async () => {
  const events = new InMemoryEventStrategy();
  const seen: string[] = [];
  events.attach(UserCreated, () => {
    seen.push('user');
  });
  events.attach(OrderPlaced, () => {
    seen.push('order');
  });

  await events.broadcast(new OrderPlaced(10));

  assert.deepEqual(seen, ['order']);
});

test('lower priority numbers run first, and the default priority is 10', async () => {
  assert.equal(DEFAULT_PRIORITY, 10);
  const events = new InMemoryEventStrategy();
  const order: string[] = [];
  events.attach(UserCreated, () => {
    order.push('late');
  }, 20);
  events.attach(UserCreated, () => {
    order.push('default');
  });
  events.attach(UserCreated, () => {
    order.push('early');
  }, 5);
  events.attach(UserCreated, () => {
    order.push('first');
  }, 0);
  events.attach(UserCreated, () => {
    order.push('negative');
  }, -1);

  await events.broadcast(new UserCreated('u'));

  assert.deepEqual(order, ['negative', 'first', 'early', 'default', 'late']);
});

test('listeners at the same priority run in the order they were attached', async () => {
  const events = new InMemoryEventStrategy();
  const order: number[] = [];
  for (const n of [1, 2, 3, 4]) {
    events.attach(UserCreated, () => {
      order.push(n);
    }, 7);
  }

  await events.broadcast(new UserCreated('u'));

  assert.deepEqual(order, [1, 2, 3, 4]);
});

test('each listener finishes before the next one starts', async () => {
  const events = new InMemoryEventStrategy();
  const log: string[] = [];
  events.attach(UserCreated, async () => {
    log.push('slow:start');
    await tick(20);
    log.push('slow:end');
  }, 1);
  events.attach(UserCreated, async () => {
    log.push('fast:start');
    await tick(1);
    log.push('fast:end');
  }, 2);

  await events.broadcast(new UserCreated('u'));

  assert.deepEqual(log, ['slow:start', 'slow:end', 'fast:start', 'fast:end']);
});

test('broadcast resolves only after the last listener has settled', async () => {
  const events = new InMemoryEventStrategy();
  let finished = false;
  events.attach(UserCreated, async () => {
    await tick(10);
    finished = true;
  });

  await events.broadcast(new UserCreated('u'));

  assert.equal(finished, true);
});

test('a broadcast with no listeners resolves', async () => {
  const events = new InMemoryEventStrategy();

  await assert.doesNotReject(() => events.broadcast(new UserCreated('u')));
});

test('the same listener at the same priority is registered once', async () => {
  const events = new InMemoryEventStrategy();
  let calls = 0;
  const listener = () => {
    calls += 1;
  };
  events.attach(UserCreated, listener, 3);
  events.attach(UserCreated, listener, 3);
  events.attach('user.created', listener, 3);

  await events.broadcast(new UserCreated('u'));

  assert.equal(calls, 1);
});

test('the same listener at two priorities runs once at each', async () => {
  const events = new InMemoryEventStrategy();
  const order: string[] = [];
  const listener = () => {
    order.push('shared');
  };
  events.attach(UserCreated, listener, 1);
  events.attach(UserCreated, () => {
    order.push('middle');
  }, 5);
  events.attach(UserCreated, listener, 9);

  await events.broadcast(new UserCreated('u'));

  assert.deepEqual(order, ['shared', 'middle', 'shared']);
});

test('a listener attached during a broadcast runs from the next broadcast', async () => {
  const events = new InMemoryEventStrategy();
  const seen: string[] = [];
  const late = () => {
    seen.push('late');
  };
  events.attach(UserCreated, () => {
    seen.push('first');
    events.attach(UserCreated, late, 20);
  }, 1);

  await events.broadcast(new UserCreated('u'));
  assert.deepEqual(seen, ['first'], 'the listener attached mid-broadcast did not run yet');

  await events.broadcast(new UserCreated('u'));
  assert.deepEqual(seen, ['first', 'first', 'late']);
});

test('a listener detached during a broadcast still runs in that broadcast, and not after', async () => {
  const events = new InMemoryEventStrategy();
  const seen: string[] = [];
  const second = () => {
    seen.push('second');
  };
  events.attach(UserCreated, () => {
    seen.push('first');
    events.detach(UserCreated, second, 2);
  }, 1);
  events.attach(UserCreated, second, 2);

  await events.broadcast(new UserCreated('u'));
  assert.deepEqual(seen, ['first', 'second']);

  await events.broadcast(new UserCreated('u'));
  assert.deepEqual(seen, ['first', 'second', 'first']);
});
