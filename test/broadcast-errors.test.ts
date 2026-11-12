/**
 * Acceptance tests: a failing listener never stops the others, and the
 * failures come back together as one AggregateError. See
 * docs/architecture/ncc-slice-6.md.
 *
 * Marked `test.skip` while InMemoryEventStrategy is a stub.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryEventStrategy } from '../dist/InMemoryEventStrategy.js';
import { UserCreated, tick } from './fixtures.ts';

test.skip('every listener runs when earlier ones throw or reject, then one AggregateError carries every error in run order', async () => {
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
  assert.match(caught.message, /\b3\b/, 'the message names the count, which no priority here shares');
  assert.match(caught.message, /user\.created/, 'the message names the event id');
});

test.skip('the AggregateError comes only after the last listener has settled', async () => {
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

test.skip('a single failing listener still rejects with an AggregateError of one', async () => {
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

test.skip('a broadcast where every listener succeeds resolves', async () => {
  const events = new InMemoryEventStrategy();
  events.attach(UserCreated, () => {});
  events.attach(UserCreated, async () => {
    await tick(1);
  });

  await assert.doesNotReject(() => events.broadcast(new UserCreated('u')));
});
