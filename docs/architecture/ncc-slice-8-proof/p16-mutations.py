# Packet P16, the deprecated root export of InMemoryEventStrategy. One
# mutation per guard in src/index.ts on this branch, plus the three
# harness controls. Each entry is (id, file, find, replace, expect).
# Run: python3 docs/architecture/ncc-slice-6-proof/mutate.py . <this file>
IX = 'src/index.ts'
IM = 'src/InMemoryEventStrategy.ts'
PJ = 'package.json'
CONST = "export const InMemoryEventStrategy = InMemoryEventStrategyClass;"
TYPE = "export type InMemoryEventStrategy = InMemoryEventStrategyClass;"
NOTE = (" * @deprecated Import `InMemoryEventStrategy` from `@tsnomad/node-integration`,\n"
        " * or from this package's `./in-memory-event-strategy` subpath. The root\n"
        " * export goes away at the next breaking release.\n */\n")
NO_NODE = (" * @deprecated Import `InMemoryEventStrategy` from this package's\n"
           " * `./in-memory-event-strategy` subpath. The root export goes away at\n"
           " * the next breaking release.\n */\n")
UNQUOTED = (" * @deprecated Import InMemoryEventStrategy from @tsnomad/node-integration,\n"
            " * or from this package's ./in-memory-event-strategy subpath. The root\n"
            " * export goes away at the next breaking release.\n */\n")
PLAIN = " * Kept for existing imports.\n */\n"
MUTATIONS = [
  ('C1-must-catch: neither root export is deprecated', IX, [(NOTE + CONST, PLAIN + CONST), (NOTE + TYPE, PLAIN + TYPE)], None, 'killed'),
  ('C2-must-survive: comment only', IX, CONST, CONST + " // harmless", 'survive'),
  ('C3-must-refuse: syntax break', IX, CONST, CONST + "(", 'refuse'),

  ('P16-1 the value export is not deprecated', IX, NOTE + CONST, PLAIN + CONST, 'killed'),
  ('P16-2 the type export is not deprecated', IX, NOTE + TYPE, PLAIN + TYPE, 'killed'),
  ('P16-3 the notes do not name the new home', IX, [(NOTE + CONST, NO_NODE + CONST), (NOTE + TYPE, NO_NODE + TYPE)], None, 'killed'),
  ('P16-4 the package name is not in backticks, so the tag ends at it', IX, [(NOTE + CONST, UNQUOTED + CONST), (NOTE + TYPE, UNQUOTED + TYPE)], None, 'killed'),
  ('P16-5 the class itself carries the tag, so the subpath is deprecated too', IM, "export class InMemoryEventStrategy", "/** @deprecated Import it from `@tsnomad/node-integration`. */\nexport class InMemoryEventStrategy", 'killed'),
  ('P16-6 the root exports a subclass, a second class', IX, [(CONST, "export class InMemoryEventStrategy extends InMemoryEventStrategyClass {}"), (TYPE, "")], None, 'killed'),
  ('P16-7 the root drops the type, so it is no longer usable as one', IX, TYPE, "", 'killed'),
  ('P16-8 the root type is a different shape', IX, TYPE, "export type InMemoryEventStrategy = { readonly marker: true };", 'killed'),
  ('P16-9 the subpath leaves the exports map', PJ, '''    "./in-memory-event-strategy": {
      "types": "./dist/InMemoryEventStrategy.d.ts",
      "default": "./dist/InMemoryEventStrategy.js"
    },
''', "", 'killed'),
]
