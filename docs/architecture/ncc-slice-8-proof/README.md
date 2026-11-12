# Slice 8 proof record, event

Slice 8 gives the in-memory strategy a new home in
`@tsnomad/node-integration`, which re-exports this package's class, so
there is still one class. This package keeps the class and its
`./in-memory-event-strategy` subpath. Packet P16 marks only the root
export `@deprecated`, with a note that names the new home, and the
source moves at the next breaking release.

`test/in-memory-deprecation.test.ts` holds P16's three acceptance tests.
They ask the TypeScript language service what an editor shows for each
import, so they check the deprecation a user sees:

1. A use of the root export as a value and as a type is struck through,
   and the note names `@tsnomad/node-integration`.
2. The subpath export, imported through the package's own `exports` map,
   is not deprecated, so a package that re-exports it passes on no
   warning.
3. The root export is still the same class as the subpath export, and
   works as a value, a type and a base class.

The files here use the method of the slice 6 proof, with its harness,
`../ncc-slice-6-proof/mutate.py`.

- `p16-stub-run.log` is the full suite with P16's `skip` markers
  removed, against this branch: 75 tests, 1 fails, and it is the first
  P16 test, because nothing is deprecated yet. The other two pass on
  today's code, since the class and its subpath already exist, and the
  mutation list shows each one failing when its guard breaks.
- `p16-architecture-mutations.py` and its log: 10 entries, three of them
  controls, against a scratch P16 in a separate clone that is never
  committed. The scratch passes all 75 tests. Each mutation breaks one
  guard and a P16 test catches it. The log ends with zero mismatches.

The first run found two holes. A deprecation on the type alias alone
passed the first test, because the name carries both meanings, so the
test now checks the struck-through name at each use. One mutation put
the tag in front of an import statement, where it means nothing, and it
left the list. Another exported an anonymous subclass, which the build
refused, so it now declares a named one.

- `p16-mutations.py` and its log: 12 entries against the committed root
  export in `src/index.ts`, three of them controls. Each of the nine
  mutations breaks one guard, including a note whose package name is
  not in backticks, so the tag ends at the `@`, and a root type of a
  different shape. Every one is caught, and the log ends with zero
  mismatches.
