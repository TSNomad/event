/**
 * Acceptance tests: detach, with and without a priority. See
 * docs/architecture/ncc-slice-6.md.
 *
 * Marked `test.skip` while InMemoryEventStrategy is a stub.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryEventStrategy } from '../dist/InMemoryEventStrategy.js';
import { UserCreated, NoId } from './fixtures.ts';

test('detach removes a listener so the next broadcast skips it', async () => {
  const events = new InMemoryEventStrategy();
  const seen: string[] = [];
  const keep = () => {
    seen.push('keep');
  };
  const drop = () => {
    seen.push('drop');
  };
  events.attach(UserCreated, keep);
  events.attach(UserCreated, drop);

  events.detach(UserCreated, drop);
  await events.broadcast(new UserCreated('u'));

  assert.deepEqual(seen, ['keep']);
});

test('detach with a priority removes only the registration at that priority', async () => {
  const events = new InMemoryEventStrategy();
  const order: string[] = [];
  const listener = () => {
    order.push('listener');
  };
  events.attach(UserCreated, listener, 1);
  events.attach(UserCreated, () => {
    order.push('marker');
  }, 5);
  events.attach(UserCreated, listener, 9);

  events.detach(UserCreated, listener, 1);
  await events.broadcast(new UserCreated('u'));

  assert.deepEqual(order, ['marker', 'listener'], 'the priority 9 registration survived, the priority 1 one did not');
});

test('detach with a priority the listener is not at leaves it attached', async () => {
  const events = new InMemoryEventStrategy();
  let calls = 0;
  const listener = () => {
    calls += 1;
  };
  events.attach(UserCreated, listener, 4);

  events.detach(UserCreated, listener, 10);
  await events.broadcast(new UserCreated('u'));

  assert.equal(calls, 1);
});

test('detach without a priority removes the registration at the default priority only', async () => {
  const events = new InMemoryEventStrategy();
  const order: string[] = [];
  const listener = (event: UserCreated) => {
    order.push(event.userId);
  };
  events.attach(UserCreated, listener);
  events.attach(UserCreated, listener, 1);
  events.attach('user.created', listener, 20);
  events.attach(UserCreated, () => {
    order.push('marker');
  }, 10);

  events.detach('user.created', listener);
  await events.broadcast(new UserCreated('u'));

  assert.deepEqual(order, ['u', 'marker', 'u'], 'priorities 1 and 20 stay, priority 10 went');
});

test('attach and detach reject an empty event id with a TypeError', () => {
  const events = new InMemoryEventStrategy();

  assert.throws(() => events.attach('', () => {}), TypeError);
  assert.throws(() => events.detach('', () => {}), TypeError);
});

test('detach by a class with no static id throws a TypeError naming the class', () => {
  const events = new InMemoryEventStrategy();

  assert.throws(
    () => events.detach(NoId as never, () => {}),
    (error: unknown) => error instanceof TypeError && error.message.includes('NoId')
  );
});

test('attach and detach reject a priority that is not an integer with a RangeError', () => {
  const events = new InMemoryEventStrategy();

  for (const priority of [Number.NaN, 1.5, Number.POSITIVE_INFINITY]) {
    assert.throws(() => events.attach(UserCreated, () => {}, priority), RangeError, `attach at ${priority}`);
    assert.throws(() => events.detach(UserCreated, () => {}, priority), RangeError, `detach at ${priority}`);
  }
  assert.doesNotThrow(() => events.attach(UserCreated, () => {}, -3), 'a negative integer is a priority');
});

test('detaching a listener that is not attached does nothing', async () => {
  const events = new InMemoryEventStrategy();
  let calls = 0;
  events.attach(UserCreated, () => {
    calls += 1;
  });

  assert.doesNotThrow(() => events.detach(UserCreated, () => {}));
  assert.doesNotThrow(() => events.detach('never.attached', () => {}));
  await events.broadcast(new UserCreated('u'));

  assert.equal(calls, 1);
});
