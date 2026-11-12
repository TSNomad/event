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

The mutations target a scratch implementation in a separate clone that
is never committed, so they do not apply to this branch. Each run
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
The P2 and P3 implementers' full lists are not in this folder. Their
logs are pasted in the packet comments on the pull request.
