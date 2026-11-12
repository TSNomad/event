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
import { eventIdOf } from '../dist/eventIdOf.js';
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

class StaticBase {
  static getId(): string {
    return 'base.static';
  }
}

test('a subclass that declares a 0.1 instance getId uses it over a static getId it inherits', async () => {
  class LegacyChild extends StaticBase {
    getId(): string {
      return 'legacy.child';
    }
  }
  class FieldChild extends StaticBase {
    readonly getId = () => 'field.child';
  }

  assert.equal(eventIdOf(new LegacyChild()), 'legacy.child');
  assert.equal(eventIdOf(new FieldChild()), 'field.child');

  const events = new InMemoryEventStrategy();
  const seen: string[] = [];
  events.attach('legacy.child', () => {
    seen.push('legacy.child');
  });
  events.attach('base.static', () => {
    seen.push('base.static');
  });
  await events.broadcast(new LegacyChild());

  assert.deepEqual(seen, ['legacy.child']);
});

test('the static getId still wins when it is declared as near as the instance getId, or nearer', () => {
  // Both on one class: the acceptance tests pin this with BothIds.
  class Both {
    static getId(): string {
      return 'both.static';
    }
    getId(): string {
      return 'both.instance';
    }
  }
  // Both inherited from one parent.
  class InheritsBoth extends Both {}
  // A static id declared below a parent's 0.1 instance id.
  class LegacyParent {
    getId(): string {
      return 'parent.instance';
    }
  }
  class StaticChild extends LegacyParent {
    static getId(): string {
      return 'child.static';
    }
  }
  // An inherited instance id two levels up, under a nearer static one.
  class StaticMiddle extends LegacyParent {
    static getId(): string {
      return 'middle.static';
    }
  }
  class Leaf extends StaticMiddle {}

  assert.equal(eventIdOf(new InheritsBoth()), 'both.static');
  assert.equal(eventIdOf(new StaticChild()), 'child.static');
  assert.equal(eventIdOf(new Leaf()), 'middle.static');
});

test('a subclass instance getId that is not a function leaves the inherited static id in force', () => {
  class OddChild extends StaticBase {
    readonly getId = 'not.a.function';
  }

  assert.equal(eventIdOf(new OddChild() as never), 'base.static');
});

test('a constructor chain of functions with no prototype still finds the static id', () => {
  // Arrow functions have no prototype, so the walk reads undefined where
  // a class would have one. The event takes its constructor and its 0.1
  // getId from its prototype, so neither is its own property.
  const Parent = Object.assign(() => {}, {
    getId(): string {
      return 'arrow.static';
    },
  });
  const Child = () => {};
  Object.setPrototypeOf(Child, Parent);
  const event = Object.create({
    constructor: Child,
    getId(): string {
      return 'stray.instance';
    },
  }) as object;

  assert.equal(eventIdOf(event as never), 'arrow.static');
});
