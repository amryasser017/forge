import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// The component rules from docs/design/01-components.md, checked against the real imports.
const SRC = path.resolve(__dirname, '../src');
const ALLOWED = {
  shared: [],
  ui: ['shared'],
  datastore: [],
  identity: ['datastore'],
  library: ['datastore', 'shared', 'ui'],
  progress: ['shared', 'ui'],
  logging: ['datastore', 'library', 'progress', 'shared', 'ui'],
  plan: ['datastore', 'library', 'progress', 'identity', 'shared', 'ui'],
  attendance: ['datastore', 'identity', 'plan', 'shared'],
  body: ['datastore', 'identity', 'shared', 'ui'],
  inbody: ['datastore', 'shared', 'ui'],
  app: ['shared', 'ui', 'datastore', 'identity', 'library', 'progress', 'logging', 'plan', 'attendance', 'body', 'inbody'],
};
const ROOT_FILES = new Set(['firebase']); // the shared Firebase app initialisation
const FIREBASE_OK = new Set(['datastore', 'identity']);

const list = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? list(path.join(d, e.name)) : [path.join(d, e.name)]));
const files = list(SRC).filter((f) => /\.(jsx?|mjs)$/.test(f));
const folderOf = (f) => path.relative(SRC, f).split(path.sep)[0];
const importsOf = (f) => [...fs.readFileSync(f, 'utf8').matchAll(/(?:from\s+|import\s*\(\s*)['"]([^'"]+)['"]/g)].map((m) => m[1]);

describe('component architecture', () => {
  it('every source folder is a known component', () => {
    const folders = new Set(files.map(folderOf).filter((x) => !x.includes('.')));
    for (const f of folders) expect(Object.keys(ALLOWED), `unknown folder ${f}`).toContain(f);
  });

  it('components only import from the components they are allowed to use', () => {
    const bad = [];
    for (const f of files) {
      const from = folderOf(f);
      if (from.includes('.')) continue; // main.jsx, firebase.js at the root
      for (const spec of importsOf(f)) {
        if (!spec.startsWith('.')) continue;
        const target = path.relative(SRC, path.resolve(path.dirname(f), spec)).split(path.sep)[0];
        if (target === from || target.includes('.') || target === '..' || ROOT_FILES.has(target)) continue;
        if (!ALLOWED[from].includes(target)) bad.push(`${path.relative(SRC, f)} -> ${spec} (${from} may not use ${target})`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('only the data store and identity import the Firebase SDK', () => {
    const bad = files.filter((f) => importsOf(f).some((s) => s.startsWith('firebase') && !FIREBASE_OK.has(folderOf(f))) && folderOf(f) !== 'firebase.js');
    expect(bad.map((f) => path.relative(SRC, f))).toEqual([]);
  });

  it('the component graph has no cycles', () => {
    const edges = {};
    for (const [from, tos] of Object.entries(ALLOWED)) edges[from] = tos;
    const state = {};
    const visit = (n, stack) => {
      if (state[n] === 2) return;
      expect(state[n], `cycle: ${[...stack, n].join(' -> ')}`).not.toBe(1);
      state[n] = 1;
      edges[n].forEach((m) => visit(m, [...stack, n]));
      state[n] = 2;
    };
    Object.keys(edges).forEach((n) => visit(n, []));
  });
});
