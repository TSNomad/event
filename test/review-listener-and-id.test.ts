/**
 * Unit tests for two gaps the slice 6 review left open in the event
 * package: attach taking a listener that is not a function, and which
 * id wins when a class inherits a static id and declares a 0.1 instance
 * id of its own.
 *
 * These are scaffolding per the implementation phase contract, not the
 * acceptance criterion.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryEventStrategy } from '../dist/InMemoryEventStrategy.js';
import { UserCreated } from './fixtures.ts';

test('attach throws a TypeError at attach time for a listener that is not a function, and registers nothing', () => {
  const events = new InMemoryEventStrategy();

  assert.throws(
    () => events.attach(UserCreated, 'not a listener' as never),
    (error: unknown) => error instanceof TypeError && error.message === "A listener must be a function, got 'not a listener'"
  );
  assert.throws(
    () => events.attach('user.created', undefined as never, 5),
    (error: unknown) => error instanceof TypeError && error.message === 'A listener must be a function, got undefined'
  );
  assert.equal(events.hasListeners('user.created'), false);
  assert.deepEqual(events.getEventIds(), []);
});
