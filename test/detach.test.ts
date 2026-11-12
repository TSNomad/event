/**
 * Acceptance tests: detach, with and without a priority. See
 * docs/architecture/ncc-slice-6.md.
 *
 * Marked `test.skip` while InMemoryEventStrategy is a stub.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryEventStrategy } from '../dist/InMemoryEventStrategy.js';
import { UserCreated } from './fixtures.ts';

test.skip('detach removes a listener so the next broadcast skips it', async () => {
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

test.skip('detach with a priority removes only the registration at that priority', async () => {
  const events = new InMemoryEventStrategy();
  const order: number[] = [];
  let calls = 0;
  const listener = () => {
    calls += 1;
    order.push(calls);
  };
  events.attach(UserCreated, listener, 1);
  events.attach(UserCreated, listener, 9);

  events.detach(UserCreated, listener, 1);
  await events.broadcast(new UserCreated('u'));

  assert.equal(calls, 1, 'the priority 9 registration is still attached');
});

test.skip('detach with a priority the listener is not at leaves it attached', async () => {
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

test.skip('detach without a priority removes the listener at every priority', async () => {
  const events = new InMemoryEventStrategy();
  let calls = 0;
  const listener = () => {
    calls += 1;
  };
  events.attach(UserCreated, listener, 1);
  events.attach(UserCreated, listener, 9);
  events.attach('user.created', listener, 20);

  events.detach('user.created', listener);
  await events.broadcast(new UserCreated('u'));

  assert.equal(calls, 0);
});

test.skip('detaching a listener that is not attached does nothing', async () => {
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
