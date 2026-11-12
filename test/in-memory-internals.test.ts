/**
 * Unit tests for the parts of InMemoryEventStrategy the acceptance tests
 * leave to the implementer: where a registration goes in its list, how
 * the removal routes handle several registrations at once, and how the
 * argument checks treat values the types already rule out.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryEventStrategy } from '../dist/InMemoryEventStrategy.js';
import { UserCreated, LegacyPing } from './fixtures.ts';

test('a registration attached between two priorities runs between them', async () => {
  const events = new InMemoryEventStrategy();
  const order: string[] = [];
  const push = (label: string) => () => {
    order.push(label);
  };
  events.attach(UserCreated, push('5a'), 5);
  events.attach(UserCreated, push('1a'), 1);
  events.attach(UserCreated, push('5b'), 5);
  events.attach(UserCreated, push('3'), 3);
  events.attach(UserCreated, push('1b'), 1);

  await events.broadcast(new UserCreated('u'));

  assert.deepEqual(order, ['1a', '1b', '3', '5a', '5b']);
});

test('clearListeners and clearAllListeners remove every registration of an id, and every handle to them goes stale', async () => {
  for (const clear of [
    (events: InMemoryEventStrategy) => events.clearListeners('legacy.ping'),
    (events: InMemoryEventStrategy) => events.clearAllListeners(),
  ]) {
    const events = new InMemoryEventStrategy();
    let calls = 0;
    const listeners = [1, 2, 3].map(() => () => {
      calls += 1;
    });
    const handles = listeners.map((listener) => events.addListener('legacy.ping', listener));
    events.attach('legacy.ping', listeners[0], 4);

    clear(events);
    assert.equal(events.listenerCount('legacy.ping'), 0);
    assert.deepEqual(events.getEventIds(), []);

    for (const listener of listeners) {
      events.addListener('legacy.ping', listener);
    }
    for (const handle of handles) {
      handle.unsubscribe();
    }
    await events.broadcast(new LegacyPing());

    assert.equal(calls, 3, 'every stale handle left the new registrations attached');
  }
});

test('removeListener removes a listener at three priorities in one call', () => {
  const events = new InMemoryEventStrategy();
  const listener = () => {};
  events.attach(UserCreated, listener, 1);
  events.attach(UserCreated, listener, 2);
  events.attach(UserCreated, listener, 3);

  events.removeListener('user.created', listener);

  assert.equal(events.listenerCount('user.created'), 0);
});

test('attach and detach refuse an event instance, which is neither a class nor an id', () => {
  const events = new InMemoryEventStrategy();

  assert.throws(
    () => events.attach(new UserCreated('u') as never, () => {}),
    (error: unknown) => error instanceof TypeError && error.message.includes('event class or an event id')
  );
  assert.throws(() => events.detach(new UserCreated('u') as never, () => {}), TypeError);
});

test('a value with no string form is still described in the TypeError', () => {
  const events = new InMemoryEventStrategy();

  assert.throws(
    () => events.attach(Object.create(null) as never, () => {}),
    (error: unknown) => error instanceof TypeError && error.message.endsWith('got object')
  );
});

test('broadcast refuses null, undefined and a number with a TypeError that asks for an event instance', async () => {
  const events = new InMemoryEventStrategy();

  for (const value of [null, undefined, 42]) {
    await assert.rejects(
      () => events.broadcast(value as never),
      (error: unknown) => error instanceof TypeError && error.message.includes('takes an event instance'),
      `broadcast of ${value}`
    );
  }
});

test('an explicit undefined priority is the default, and null is refused', async () => {
  const events = new InMemoryEventStrategy();
  const order: string[] = [];
  events.attach(UserCreated, () => {
    order.push('nine');
  }, 9);
  events.attach(UserCreated, () => {
    order.push('undefined');
  }, undefined);
  events.attach(UserCreated, () => {
    order.push('eleven');
  }, 11);

  await events.broadcast(new UserCreated('u'));

  assert.deepEqual(order, ['nine', 'undefined', 'eleven']);
  assert.throws(() => events.attach(UserCreated, () => {}, null as never), RangeError);
});

test('the 0.1 methods refuse an id that is not a string with a TypeError', () => {
  const events = new InMemoryEventStrategy();

  assert.throws(() => events.hasListeners(undefined as never), TypeError);
  assert.throws(() => events.listenerCount(42 as never), TypeError);
  assert.throws(() => events.addListener(null as never, () => {}), TypeError);
});

test('the subscription for a listener attached by addListener at 10 is the registration attach made there', async () => {
  const events = new InMemoryEventStrategy();
  let calls = 0;
  const listener = () => {
    calls += 1;
  };
  events.attach('legacy.ping', listener);
  const handle = events.addListener('legacy.ping', listener);
  assert.equal(events.listenerCount('legacy.ping'), 1);

  handle.unsubscribe();
  await events.broadcast(new LegacyPing());

  assert.equal(calls, 0);
});

test('removeListener and clearListeners on an id with nothing attached do nothing', () => {
  const events = new InMemoryEventStrategy();

  assert.doesNotThrow(() => events.removeListener('never.attached', () => {}));
  assert.doesNotThrow(() => events.clearListeners('never.attached'));
  assert.deepEqual(events.getEventIds(), []);
});

test('broadcast of an event class names the class without quoting its source', async () => {
  const events = new InMemoryEventStrategy();

  await assert.rejects(
    () => events.broadcast(UserCreated as never),
    (error: unknown) =>
      error instanceof TypeError &&
      error.message === 'broadcast takes an event instance, not the event class UserCreated'
  );
});
