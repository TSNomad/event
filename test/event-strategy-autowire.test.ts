/**
 * Unit test the slice 6 review named as missing: a class that lists the
 * EventStrategy token in its static inject list gets the bus the
 * application bound, through the real container.
 *
 * Scaffolding per the implementation phase contract, not the acceptance
 * criterion.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Container } from '@tsnomad/di-container';
import { EventStrategy } from '../dist/EventStrategy.js';
import { InMemoryEventStrategy } from '../dist/InMemoryEventStrategy.js';
import { UserCreated } from './fixtures.ts';

class WelcomeMailer {
  static readonly inject = [EventStrategy] as const;
  readonly events: EventStrategy;
  constructor(events: EventStrategy) {
    this.events = events;
  }
}

test('an inject list naming the EventStrategy token autowires the bound bus', async () => {
  const container = new Container();
  container.bind(InMemoryEventStrategy, EventStrategy, InMemoryEventStrategy);

  const mailer = await container.get(WelcomeMailer);
  const bus = await container.get(EventStrategy);

  assert.ok(mailer.events instanceof InMemoryEventStrategy);
  assert.equal(mailer.events, bus, 'the autowired class gets the one bus bound under the token');

  const seen: string[] = [];
  mailer.events.attach(UserCreated, (event) => {
    seen.push(event.userId);
  });
  await (await container.get(InMemoryEventStrategy)).broadcast(new UserCreated('autowired'));

  assert.deepEqual(seen, ['autowired'], 'a listener attached through the autowired bus hears a broadcast through the class');
});
