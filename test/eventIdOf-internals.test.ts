/**
 * Unit tests for the parts of eventIdOf the acceptance tests leave to
 * the implementer: how it labels a class with no name or no class at
 * all, and what it does with a value that has no usable constructor.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eventIdOf } from '../dist/eventIdOf.js';

test('an anonymous class with no id gets a stand-in label in the TypeError', () => {
  const Anonymous = (() => class {})();
  assert.equal(Anonymous.name, '');

  assert.throws(
    () => eventIdOf(new Anonymous()),
    (error: unknown) => error instanceof TypeError && error.message.includes('(anonymous class)')
  );
});

test('an object with a null prototype falls back to its own getId', () => {
  const event = Object.assign(Object.create(null) as object, { getId: () => 'bare.object' });

  assert.equal(eventIdOf(event), 'bare.object');
});

test('an object with a null prototype and no getId throws a TypeError saying it has no class', () => {
  const event = Object.create(null) as object;

  assert.throws(
    () => eventIdOf(event),
    (error: unknown) => error instanceof TypeError && error.message.includes('(no class)')
  );
});

test('a static getId that is not a function does not count, so the instance id is used', () => {
  class OddStatic {
    static getId = 'not.a.function';
    getId(): string {
      return 'odd.instance';
    }
  }

  assert.equal(eventIdOf(new OddStatic()), 'odd.instance');
});

test('the static getId is called with the class as this, so an inherited static id reads the subclass', () => {
  class Base {
    static prefix = 'base';
    static getId(): string {
      return `${this.prefix}.event`;
    }
  }
  class Child extends Base {
    static prefix = 'child';
  }

  assert.equal(eventIdOf(Child), 'child.event');
  assert.equal(eventIdOf(new Child()), 'child.event');
});

test('the instance getId is called with the instance as this', () => {
  class Legacy {
    readonly name = 'legacy.this';
    getId(): string {
      return this.name;
    }
  }

  assert.equal(eventIdOf(new Legacy()), 'legacy.this');
});
