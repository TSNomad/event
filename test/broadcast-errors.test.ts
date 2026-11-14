/**
 * Acceptance tests: a failing listener never stops the others, and the
 * failures come back together as one AggregateError. See
 * docs/architecture/ncc-slice-6.md.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryEventStrategy } from '../dist/InMemoryEventStrategy.js';
import { UserCreated, OrderPlaced, tick } from './fixtures.ts';

test('every listener runs when earlier ones throw or reject, then one AggregateError carries every error in run order', async () => {
  const events = new InMemoryEventStrategy();
  const ran: string[] = [];
  const syncError = new Error('sync failure');
  const asyncError = new TypeError('async failure');
  const lateError = new RangeError('late failure');

  events.attach(UserCreated, () => {
    ran.push('throws');
    throw syncError;
  }, 1);
  events.attach(UserCreated, async () => {
    ran.push('rejects');
    await tick(1);
    throw asyncError;
  }, 5);
  events.attach(UserCreated, () => {
    ran.push('outbox');
  }, 7);
  events.attach(UserCreated, () => {
    ran.push('late');
    throw lateError;
  }, 9);

  let caught: unknown;
  try {
    await events.broadcast(new UserCreated('u'));
  } catch (error) {
    caught = error;
  }

  assert.deepEqual(ran, ['throws', 'rejects', 'outbox', 'late'], 'every listener ran once, past the failures');
  assert.ok(caught instanceof AggregateError, 'broadcast rejects with an AggregateError');
  assert.deepEqual(caught.errors, [syncError, asyncError, lateError]);
  assert.equal(caught.message, "3 listener(s) threw during broadcast of 'user.created'", 'the 0.1 message, with the count and the id');
});

test('the AggregateError comes only after the last listener has settled', async () => {
  const events = new InMemoryEventStrategy();
  let lastFinished = false;
  events.attach(UserCreated, () => {
    throw new Error('first fails');
  }, 1);
  events.attach(UserCreated, async () => {
    await tick(15);
    lastFinished = true;
  }, 2);

  await assert.rejects(() => events.broadcast(new UserCreated('u')), AggregateError);

  assert.equal(lastFinished, true);
});

test('a single failing listener still rejects with an AggregateError of one', async () => {
  const events = new InMemoryEventStrategy();
  const failure = new Error('only failure');
  events.attach(UserCreated, () => {
    throw failure;
  });
  events.attach(UserCreated, () => {});

  await assert.rejects(
    () => events.broadcast(new UserCreated('u')),
    (error: unknown) => error instanceof AggregateError && error.errors.length === 1 && error.errors[0] === failure
  );
});

test('a broadcast where every listener succeeds resolves', async () => {
  const events = new InMemoryEventStrategy();
  events.attach(UserCreated, () => {});
  events.attach(UserCreated, async () => {
    await tick(1);
  });

  await assert.doesNotReject(() => events.broadcast(new UserCreated('u')));
});

test('broadcast rejects an event class, a number and a string with a TypeError, and runs no listener', async () => {
  const events = new InMemoryEventStrategy();
  let calls = 0;
  events.attach(UserCreated, () => {
    calls += 1;
  });
  events.attach(OrderPlaced, () => {
    calls += 1;
  });

  await assert.rejects(
    () => events.broadcast(UserCreated as never),
    (error: unknown) => error instanceof TypeError && /UserCreated/.test(error.message),
    'a class is refused, naming it, even though it carries a static id'
  );
  await assert.rejects(() => events.broadcast(42 as never), TypeError);
  await assert.rejects(() => events.broadcast('order.placed' as never), TypeError);
  assert.equal(calls, 0);
});
