/**
 * Event classes shared by the acceptance tests. Plain fields, no
 * parameter properties, so node can run these files by stripping types.
 */

import type { Event } from '../dist/types.js';

export class UserCreated implements Event {
  static getId(): string {
    return 'user.created';
  }
  readonly userId: string;
  constructor(userId: string) {
    this.userId = userId;
  }
}

export class OrderPlaced implements Event {
  static getId(): string {
    return 'order.placed';
  }
  readonly total: number;
  constructor(total: number) {
    this.total = total;
  }
}

/** A 0.1 event: an instance getId() and no static one. */
export class LegacyPing implements Event {
  getId(): string {
    return 'legacy.ping';
  }
}

/** Both forms, disagreeing. The static id must win. */
export class BothIds implements Event {
  static getId(): string {
    return 'both.static';
  }
  getId(): string {
    return 'both.instance';
  }
}

/** Neither form. */
export class NoId implements Event {}

export const tick = (ms = 5): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
