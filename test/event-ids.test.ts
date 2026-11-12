/**
 * Acceptance tests: static event ids, with the 0.1 instance id still
 * honored. See docs/architecture/ncc-slice-6.md.
 *
 * Marked `test.skip` while eventIdOf and InMemoryEventStrategy are stubs.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eventIdOf } from '../dist/eventIdOf.js';
import { InMemoryEventStrategy } from '../dist/InMemoryEventStrategy.js';
import { UserCreated, LegacyPing, BothIds, NoId } from './fixtures.ts';

test('eventIdOf reads the static id from an event class and from an instance', () => {
  assert.equal(eventIdOf(UserCreated), 'user.created');
  assert.equal(eventIdOf(new UserCreated('u')), 'user.created');
});

test('eventIdOf falls back to the 0.1 instance getId when the class has no static one', () => {
  assert.equal(eventIdOf(new LegacyPing()), 'legacy.ping');
  assert.equal(eventIdOf({ getId: () => 'plain.object' }), 'plain.object');
});

test('eventIdOf prefers the static id when both exist', () => {
  assert.equal(eventIdOf(new BothIds()), 'both.static');
  assert.equal(eventIdOf(BothIds), 'both.static');
});

test('eventIdOf throws a TypeError naming the class when there is no id', () => {
  assert.throws(
    () => eventIdOf(new NoId()),
    (error: unknown) => error instanceof TypeError && error.message.includes('NoId')
  );
  assert.throws(
    () => eventIdOf(NoId as never),
    (error: unknown) => error instanceof TypeError && error.message.includes('NoId')
  );
});

test('eventIdOf throws a TypeError when the id is empty or is not a string', () => {
  class EmptyId {
    static getId(): string {
      return '';
    }
  }
  class NumberId {
    static getId(): unknown {
      return 42;
    }
  }

  assert.throws(() => eventIdOf(new EmptyId()), TypeError);
  assert.throws(() => eventIdOf(new NumberId() as never), TypeError);
});

test('a 0.1 event with only an instance id still reaches its listeners', async () => {
  const events = new InMemoryEventStrategy();
  let calls = 0;
  events.attach('legacy.ping', () => {
    calls += 1;
  });

  await events.broadcast(new LegacyPing());

  assert.equal(calls, 1);
});

test('broadcast of an event with no id rejects with a TypeError and runs no listener', async () => {
  const events = new InMemoryEventStrategy();
  let calls = 0;
  events.attach('undefined', () => {
    calls += 1;
  });

  await assert.rejects(() => events.broadcast(new NoId()), TypeError);
  assert.equal(calls, 0);
});

test('attach with an event class that has no static id throws a TypeError naming the class', () => {
  const events = new InMemoryEventStrategy();

  assert.throws(
    () => events.attach(LegacyPing as never, () => {}),
    (error: unknown) => error instanceof TypeError && error.message.includes('LegacyPing')
  );
});
