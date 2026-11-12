# One mutation per guard in test/in-memory-deprecation.test.ts, against
# the architecture phase's scratch root export in a separate clone. Each
# entry is (id, file, find, replace, expect). The first three are the
# harness controls.
IX = 'src/index.ts'
IM = 'src/InMemoryEventStrategy.ts'
PJ = 'package.json'
CONST = "export const InMemoryEventStrategy = InMemoryEventStrategyClass;"
TYPE = "export type InMemoryEventStrategy = InMemoryEventStrategyClass;"
DEP = " * @deprecated Import `InMemoryEventStrategy` from `@tsnomad/node-integration`,\n"
MUTATIONS = [
  ('C1-must-catch: no deprecation on either export', IX, [(DEP + " * or from this package's `./in-memory-event-strategy` subpath. The root\n * export goes away at the next breaking release.\n */\n" + CONST, " * Old home.\n */\n" + CONST), (DEP + " * or from this package's `./in-memory-event-strategy` subpath. The root\n * export goes away at the next breaking release.\n */\n" + TYPE, " * Old home.\n */\n" + TYPE)], None, 'killed'),
  ('C2-must-survive: comment only', IX, CONST, CONST + " // harmless", 'survive'),
  ('C3-must-refuse: syntax break', IX, CONST, CONST + "(", 'refuse'),

  ('P16-1 the value export is not deprecated', IX, DEP + " * or from this package's `./in-memory-event-strategy` subpath. The root\n * export goes away at the next breaking release.\n */\n" + CONST, " * Old home.\n */\n" + CONST, 'killed'),
  ('P16-2 the type export is not deprecated', IX, DEP + " * or from this package's `./in-memory-event-strategy` subpath. The root\n * export goes away at the next breaking release.\n */\n" + TYPE, " * Old home.\n */\n" + TYPE, 'killed'),
  ('P16-3 the note names no new home', IX, [(DEP + " * or from this package's `./in-memory-event-strategy` subpath. The root\n * export goes away at the next breaking release.\n */\n" + CONST, " * @deprecated It goes away at the next breaking release.\n */\n" + CONST), (DEP + " * or from this package's `./in-memory-event-strategy` subpath. The root\n * export goes away at the next breaking release.\n */\n" + TYPE, " * @deprecated It goes away at the next breaking release.\n */\n" + TYPE)], None, 'killed'),
  ('P16-4 the class itself carries the tag', IM, "export class InMemoryEventStrategy", "/** @deprecated Import it from `@tsnomad/node-integration`. */\nexport class InMemoryEventStrategy", 'killed'),
  ('P16-5 the root exports a subclass, a second class', IX, [(CONST, "export class InMemoryEventStrategy extends InMemoryEventStrategyClass {}"), (TYPE, "")], None, 'killed'),
  ('P16-6 the root drops the type, so it is no longer usable as one', IX, TYPE, "", 'killed'),
  ('P16-7 the subpath leaves the exports map', PJ, '''    "./in-memory-event-strategy": {
      "types": "./dist/InMemoryEventStrategy.d.ts",
      "default": "./dist/InMemoryEventStrategy.js"
    },
''', "", 'killed'),
]
