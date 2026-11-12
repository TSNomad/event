/**
 * Acceptance test, integration shape (KB 568): the EventStrategy token
 * resolves an InMemoryEventStrategy through a real container, and a
 * broadcast through the resolved instance reaches a listener. Uses the
 * container's 0.1 factory binding, which already exists, so this test
 * needs only the event package's stubs filled in.
 *
 * Marked `test.skip` while InMemoryEventStrategy is a stub.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Container } from '@tsnomad/di-container';
import { EventStrategy } from '../dist/EventStrategy.js';
import { ActionBindingStrategy } from '../dist/ActionBindingStrategy.js';
import { InMemoryEventStrategy } from '../dist/InMemoryEventStrategy.js';
import { UserCreated } from './fixtures.ts';

test('the interface tokens carry namespaced names', () => {
  assert.equal(EventStrategy.name, 'tsnomad/event/EventStrategy');
  assert.equal(ActionBindingStrategy.name, 'tsnomad/event/ActionBindingStrategy');
});

test.skip('the EventStrategy token resolves a shared InMemoryEventStrategy that broadcasts', async () => {
  const container = new Container();
  container.bind(EventStrategy, () => new InMemoryEventStrategy());

  const events = await container.get(EventStrategy);
  const again = await container.get(EventStrategy);
  const seen: string[] = [];
  events.attach(UserCreated, (event) => {
    seen.push(event.userId);
  });
  await again.broadcast(new UserCreated('via-token'));

  assert.ok(events instanceof InMemoryEventStrategy);
  assert.equal(events, again);
  assert.deepEqual(seen, ['via-token']);
});
