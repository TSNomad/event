/**
 * Acceptance tests: the 0.1 listener methods keep working on
 * InMemoryEventStrategy, deprecated, for the five current consumers.
 * See docs/architecture/ncc-slice-6.md.
 *
 * Marked `test.skip` while InMemoryEventStrategy is a stub.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryEventStrategy } from '../dist/InMemoryEventStrategy.js';
import { UserCreated, LegacyPing } from './fixtures.ts';

test.skip('addListener attaches at the default priority', async () => {
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

test.skip('unsubscribe on the handle addListener returns detaches that listener', async () => {
  const events = new InMemoryEventStrategy();
  let calls = 0;
  const subscription = events.addListener('legacy.ping', () => {
    calls += 1;
  });

  subscription.unsubscribe();
  await events.broadcast(new LegacyPing());

  assert.equal(calls, 0);
  assert.equal(events.hasListeners('legacy.ping'), false);
});

test.skip('unsubscribe leaves the same listener attached at another priority', async () => {
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

test.skip('a second unsubscribe on a spent handle does not remove a later registration', async () => {
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

test.skip('removeListener detaches a listener', async () => {
  const events = new InMemoryEventStrategy();
  let calls = 0;
  const listener = () => {
    calls += 1;
  };
  events.addListener('legacy.ping', listener);

  events.removeListener('legacy.ping', listener);
  await events.broadcast(new LegacyPing());

  assert.equal(calls, 0);
});

test.skip('hasListeners, listenerCount and getEventIds report attached listeners at any priority', () => {
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

test.skip('clearListeners empties one event and clearAllListeners empties every event', async () => {
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
