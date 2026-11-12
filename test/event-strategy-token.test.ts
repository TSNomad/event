/**
 * Acceptance tests, integration shape: the event package wired through
 * a real container, the way an application wires it. The class-path
 * `bind` comes from @tsnomad/di-container 0.2.0, so the second test
 * needs both the container's packet and this package's packet.
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

test('the interface tokens carry the interface names, so they share bindings with the loader 0.1 string tokens', () => {
  assert.equal(EventStrategy.name, 'EventStrategy');
  assert.equal(ActionBindingStrategy.name, 'ActionBindingStrategy');
});

test.skip('a 0.1 factory binding under the token resolves a strategy that broadcasts', async () => {
  const container = new Container();
  container.bind('EventStrategy', () => new InMemoryEventStrategy());

  const events = await container.get(EventStrategy);
  const seen: string[] = [];
  events.attach(UserCreated, (event) => {
    seen.push(event.userId);
  });
  await events.broadcast(new UserCreated('via-token'));

  assert.deepEqual(seen, ['via-token']);
});

test.skip('the documented class binding gives the token and the class one shared bus', async () => {
  const container = new Container();
  container.bind(InMemoryEventStrategy, EventStrategy, InMemoryEventStrategy);

  const byToken = await container.get(EventStrategy);
  const byClass = await container.get(InMemoryEventStrategy);
  const seen: string[] = [];
  byClass.attach(UserCreated, (event) => {
    seen.push(event.userId);
  });
  await byToken.broadcast(new UserCreated('shared'));

  assert.deepEqual(seen, ['shared'], 'a listener attached through the class hears a broadcast through the token');
});
