/**
 * Acceptance tests: the 0.1 listener methods keep working on
 * InMemoryEventStrategy, deprecated, for the five current consumers.
 * See docs/architecture/ncc-slice-6.md.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryEventStrategy } from '../dist/InMemoryEventStrategy.js';
import { UserCreated, LegacyPing } from './fixtures.ts';

test('addListener attaches at the default priority', async () => {
  const events = new InMemoryEventStrategy();
  const order: string[] = [];
  events.attach(UserCreated, () => {
    order.push('after');
  }, 11);
  events.addListener('user.created', () => {
    order.push('added');
  });
  events.attach(UserCreated, () => {
    order.push('before');
  }, 9);

  await events.broadcast(new UserCreated('u'));

  assert.deepEqual(order, ['before', 'added', 'after']);
});

test('unsubscribe on the handle addListener returns detaches that listener', async () => {
  const events = new InMemoryEventStrategy();
  let calls = 0;
  const subscription = events.addListener('legacy.ping', () => {
    calls += 1;
  });
  await events.broadcast(new LegacyPing());
  assert.equal(calls, 1, 'the listener was attached');

  subscription.unsubscribe();
  await events.broadcast(new LegacyPing());

  assert.equal(calls, 1, 'the listener did not run again');
  assert.equal(events.hasListeners('legacy.ping'), false);
});

test('unsubscribe leaves the same listener attached at another priority', async () => {
  const events = new InMemoryEventStrategy();
  let calls = 0;
  const listener = () => {
    calls += 1;
  };
  const subscription = events.addListener('legacy.ping', listener);
  events.attach('legacy.ping', listener, 3);

  subscription.unsubscribe();
  await events.broadcast(new LegacyPing());

  assert.equal(calls, 1, 'the priority 3 registration still runs');
});

test('a second unsubscribe on a spent handle does not remove a later registration', async () => {
  const events = new InMemoryEventStrategy();
  let calls = 0;
  const listener = () => {
    calls += 1;
  };
  const first = events.addListener('legacy.ping', listener);
  first.unsubscribe();
  events.addListener('legacy.ping', listener);

  first.unsubscribe();
  await events.broadcast(new LegacyPing());

  assert.equal(calls, 1);
});

test('removeListener detaches a listener', async () => {
  const events = new InMemoryEventStrategy();
  let calls = 0;
  const listener = () => {
    calls += 1;
  };
  events.addListener('legacy.ping', listener);
  await events.broadcast(new LegacyPing());
  assert.equal(calls, 1, 'the listener was attached');

  events.removeListener('legacy.ping', listener);
  await events.broadcast(new LegacyPing());

  assert.equal(calls, 1, 'the listener did not run again');
});

test('hasListeners, listenerCount and getEventIds report attached listeners at any priority', () => {
  const events = new InMemoryEventStrategy();
  const listener = () => {};
  assert.equal(events.hasListeners('user.created'), false);
  assert.equal(events.listenerCount('user.created'), 0);
  assert.deepEqual(events.getEventIds(), []);

  events.attach(UserCreated, listener, 1);
  events.attach(UserCreated, listener, 2);
  events.addListener('legacy.ping', () => {});

  assert.equal(events.hasListeners('user.created'), true);
  assert.equal(events.listenerCount('user.created'), 2, 'one registration per listener per priority');
  assert.deepEqual([...events.getEventIds()].sort(), ['legacy.ping', 'user.created']);

  events.removeListener('user.created', listener);
  assert.equal(events.hasListeners('user.created'), false, 'removeListener takes the listener off at every priority');
  assert.deepEqual(events.getEventIds(), ['legacy.ping'], 'an id with no listeners left is not reported');
});

test('clearListeners empties one event and clearAllListeners empties every event', async () => {
  const events = new InMemoryEventStrategy();
  const seen: string[] = [];
  events.attach(UserCreated, () => {
    seen.push('user');
  });
  events.addListener('legacy.ping', () => {
    seen.push('ping');
  });

  events.clearListeners('user.created');
  await events.broadcast(new UserCreated('u'));
  await events.broadcast(new LegacyPing());
  assert.deepEqual(seen, ['ping']);

  events.clearAllListeners();
  await events.broadcast(new LegacyPing());
  assert.deepEqual(seen, ['ping']);
  assert.deepEqual(events.getEventIds(), []);
});

test('two handles to one registration: either removes it, and neither removes a later one', async () => {
  const events = new InMemoryEventStrategy();
  let calls = 0;
  const listener = () => {
    calls += 1;
  };
  const first = events.addListener('legacy.ping', listener);
  const second = events.addListener('legacy.ping', listener);
  assert.equal(events.listenerCount('legacy.ping'), 1, 'the second add found the first registration');

  first.unsubscribe();
  assert.equal(events.hasListeners('legacy.ping'), false, 'one handle removed the shared registration');

  events.addListener('legacy.ping', listener);
  second.unsubscribe();
  await events.broadcast(new LegacyPing());

  assert.equal(calls, 1, 'a handle to a removed registration left the new one attached');
});

test('the 0.1 methods that take an id reject an empty one with a TypeError, as attach does', () => {
  const events = new InMemoryEventStrategy();

  assert.throws(() => events.addListener('', () => {}), TypeError);
  assert.throws(() => events.removeListener('', () => {}), TypeError);
  assert.throws(() => events.hasListeners(''), TypeError);
  assert.throws(() => events.listenerCount(''), TypeError);
  assert.throws(() => events.clearListeners(''), TypeError);
});

test('the second handle alone removes the live registration', async () => {
  const events = new InMemoryEventStrategy();
  let calls = 0;
  const listener = () => {
    calls += 1;
  };
  events.addListener('legacy.ping', listener);
  const second = events.addListener('legacy.ping', listener);

  second.unsubscribe();
  await events.broadcast(new LegacyPing());

  assert.equal(events.hasListeners('legacy.ping'), false, 'a handle from a call that found the registration removes it');
  assert.equal(calls, 0);
});

test('a handle goes stale when its registration is removed by detach, removeListener, clearListeners or clearAllListeners', async () => {
  const removals: Record<string, (events: InMemoryEventStrategy, listener: () => void) => void> = {
    detach: (events, listener) => events.detach('legacy.ping', listener),
    removeListener: (events, listener) => events.removeListener('legacy.ping', listener),
    clearListeners: (events) => events.clearListeners('legacy.ping'),
    clearAllListeners: (events) => events.clearAllListeners(),
  };
  for (const [name, remove] of Object.entries(removals)) {
    const events = new InMemoryEventStrategy();
    let calls = 0;
    const listener = () => {
      calls += 1;
    };
    const stale = events.addListener('legacy.ping', listener);
    remove(events, listener);
    events.addListener('legacy.ping', listener);
    stale.unsubscribe();
    await events.broadcast(new LegacyPing());

    assert.equal(calls, 1, `after ${name}, the stale handle left the new registration attached`);
  }
});
