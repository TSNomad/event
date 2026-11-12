# The event suite scored against mutations in the scratch container it installs.
# Run: mutate.py <proof-di> event-cross-repo.py <proof-event>
MUTATIONS = [
 ('C1-must-catch: class bind stores nothing', 'src/Container.ts',
  'for (const key of keys) this.bindings.set(key, { factory, singleton: true, concrete: first });', '', 'killed'),
 ('C2-must-survive: comment only', 'src/Container.ts',
  '    const args: unknown[] = [];', '    // harmless\n    const args: unknown[] = [];', 'survive'),
 ('C3-must-refuse: syntax break', 'src/Container.ts', '    const args: unknown[] = [];', '    const args: unknown[ = [];', 'refuse'),
 ('X1 the class bind gives each abstract its own instance', 'src/Container.ts',
  '        if (!shared) {', '        if (Date.now() > 0) {', 'killed'),
]
