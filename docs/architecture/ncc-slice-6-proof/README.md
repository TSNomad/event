# Slice 6 proof record

This folder holds the evidence that each acceptance test is a contract,
as the Proof section of `../ncc-slice-6.md` describes.

- `mutate.py` runs the suite once per mutation in `mutations.py` and
  writes `mutations.log`. A mutation counts as caught when the suite
  exits non-zero, and each entry names the guard it breaks and lists the
  tests that went red. It runs `node --test --test-timeout=20000` rather
  than `npm test`, so a mutation that makes a test hang fails that test
  instead of stalling the run.
- `types-mutate.py` does the same for the compile-only type test, from
  `type-mutations.py` into `type-mutations.log`, and reports which
  `@ts-expect-error` lines each loosening left unused.
- `cross-repo-mutations.py` holds mutations made in the scratch
  container, scored by `mutate.py` against this package's suite, with
  its three controls, into `cross-repo-mutations.log`.

`mutations.py`, `type-mutations.py`, `cross-repo-mutations.py` and
their logs come from the architecture phase. They target a scratch
implementation in a separate clone that is never committed, so they do
not apply to this branch. Each run
starts with three controls: a break the harness must catch, a comment it
must not, and a syntax error it must refuse to score.

## Review spot check at the PR head

`review-mutations.py` and `review-mutations.log` come from the slice 6
review. Unlike the lists above, they target this branch's own code, so
anyone can rerun them here:

```
python3 docs/architecture/ncc-slice-6-proof/mutate.py . docs/architecture/ncc-slice-6-proof/review-mutations.py
```

The brief capped the review at ten mutations, so the list samples
`InMemoryEventStrategy` and `eventIdOf` and does not cover every guard.
## Packet P2 and P3 lists

`p2-mutations.py` and `p2-mutations.log` are the P2 implementer's full
list, 19 entries with the three controls, run against the P2 head,
0cd8566. `p3-mutations.py` and `p3-mutations.log` are the P3
implementer's, 55 entries with the three controls, run against the P3
head, af14676. Both logs end with zero mismatches. Each list targets
the code at its own head, so rerun it from a checkout of that commit.
The review's spot check above covers the later head, 3af80be.

## Lane s06-b fixes

`s06-b-mutations.py` and its log prove the unit tests for two findings
the review left open, `attach` refusing a listener that is not a
function and a subclass's own 0.1 `getId` winning over an inherited
static one, and the test that autowires `EventStrategy` through an
`inject` list. It holds one mutation per guard and the three controls.
The A entries change the container installed in `node_modules`, so run
`npm install` first:

```
python3 docs/architecture/ncc-slice-6-proof/mutate.py . docs/architecture/ncc-slice-6-proof/s06-b-mutations.py
```
