/**
 * Acceptance tests for the deprecated root export of InMemoryEventStrategy.
 *
 * The in-memory strategy's new home is @tsnomad/node-integration, which
 * re-exports this package's class, so there is one class. This package
 * keeps the class and its `./in-memory-event-strategy` subpath, and marks
 * only the root export deprecated. The source moves at the next breaking
 * release.
 *
 * The subpath imports use the package's own name, so they go through its
 * `exports` map the way a consumer's do.
 *
 * The tests ask the TypeScript language service what an editor would
 * show for each import, so they check the deprecation a user sees, not
 * the text of a file. Each test is marked `skip` until the packet
 * implements it. Remove only that marker.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import * as root from '../dist/index.js';
import { InMemoryEventStrategy as Direct } from '@tsnomad/event/in-memory-event-strategy';

const testDir = dirname(fileURLToPath(import.meta.url));
const DEPRECATED = 6385; // "'{0}' is deprecated."

/**
 * Builds a language service over one probe source, placed in this test
 * folder so its relative imports reach ../dist.
 */
function probe(source: string) {
  const fileName = join(testDir, '__deprecation-probe.ts');
  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    types: [],
  };
  const host: ts.LanguageServiceHost = {
    getScriptFileNames: () => [fileName],
    getScriptVersion: () => '1',
    getScriptSnapshot: (file) => {
      if (file === fileName) return ts.ScriptSnapshot.fromString(source);
      return existsSync(file) ? ts.ScriptSnapshot.fromString(readFileSync(file, 'utf8')) : undefined;
    },
    getCurrentDirectory: () => testDir,
    getCompilationSettings: () => options,
    getDefaultLibFileName: (o) => ts.getDefaultLibFilePath(o),
    fileExists: (file) => file === fileName || ts.sys.fileExists(file),
    readFile: (file) => (file === fileName ? source : ts.sys.readFile(file)),
    readDirectory: ts.sys.readDirectory,
    directoryExists: ts.sys.directoryExists,
    getDirectories: ts.sys.getDirectories,
  };
  const service = ts.createLanguageService(host);
  return {
    errors: service.getSemanticDiagnostics(fileName).map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n')),
    deprecations: service.getSuggestionDiagnostics(fileName).filter((d) => d.code === DEPRECATED).map((d) => source.slice(d.start, (d.start ?? 0) + (d.length ?? 0))),
    /** True when the editor strikes through the name that starts `text`'s last occurrence. */
    deprecatedAt(text: string): boolean {
      const at = source.lastIndexOf(text);
      return service.getSuggestionDiagnostics(fileName).some((d) => d.code === DEPRECATED && d.start === at);
    },
    deprecatedTagAt(text: string): string | null {
      const info = service.getQuickInfoAtPosition(fileName, source.lastIndexOf(text));
      const tag = info?.tags?.find((t) => t.name === 'deprecated');
      return tag === undefined ? null : ts.displayPartsToString(tag.text);
    },
  };
}

test('the root export is deprecated where it is used, and the note names @tsnomad/node-integration', () => {
  const source = [
    "import { InMemoryEventStrategy } from '../dist/index.js';",
    'export const bus = new InMemoryEventStrategy();',
    'export let typed: InMemoryEventStrategy | null = null;',
    '',
  ].join('\n');
  const result = probe(source);
  assert.deepEqual(result.errors, []);
  assert.ok(result.deprecations.includes('InMemoryEventStrategy'), `deprecations: ${JSON.stringify(result.deprecations)}`);
  for (const use of ['InMemoryEventStrategy()', 'InMemoryEventStrategy | null']) {
    assert.ok(result.deprecatedAt(use), `not struck through at ${use}`);
    const note = result.deprecatedTagAt(use);
    assert.ok(note !== null && note.includes('@tsnomad/node-integration'), `deprecated note at ${use}: ${note}`);
  }
});

test('the in-memory-event-strategy subpath is not deprecated, so a package that re-exports it passes on no warning', () => {
  const source = [
    "import { InMemoryEventStrategy } from '@tsnomad/event/in-memory-event-strategy';",
    'export const bus = new InMemoryEventStrategy();',
    'export class Audited extends InMemoryEventStrategy {}',
    '',
  ].join('\n');
  const result = probe(source);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.deprecations, []);
});

test('the root export is still the one class, usable as a value, a type and a base class', () => {
  assert.equal(root.InMemoryEventStrategy, Direct);
  const source = [
    "import { InMemoryEventStrategy } from '../dist/index.js';",
    "import { InMemoryEventStrategy as Direct } from '@tsnomad/event/in-memory-event-strategy';",
    'const bus: InMemoryEventStrategy = new Direct();',
    'const back: Direct = new InMemoryEventStrategy();',
    'class Audited extends InMemoryEventStrategy {}',
    'export { bus, back, Audited };',
    '',
  ].join('\n');
  assert.deepEqual(probe(source).errors, []);
});
