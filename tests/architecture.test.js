import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// The component rules from docs/design/01-components.md, checked against the real imports.
// Four components are workspace packages (packages/*); the rest are folders of the app (src/*).
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const PKGS = path.join(ROOT, 'packages');

const PACKAGES = { shared: [], ui: [], datastore: [], identity: ['datastore'] };
const FOLDERS = {
  library: ['datastore', 'shared', 'ui'],
  progress: ['shared', 'ui'],
  logging: ['datastore', 'library', 'progress', 'shared', 'ui'],
  plan: ['datastore', 'library', 'progress', 'identity', 'shared', 'ui'],
  attendance: ['datastore', 'identity', 'plan', 'shared'],
  body: ['datastore', 'identity', 'shared', 'ui'],
  inbody: ['datastore', 'shared', 'ui'],
  app: ['shared', 'ui', 'datastore', 'identity', 'library', 'progress', 'logging', 'plan', 'attendance', 'body', 'inbody'],
};
const FIREBASE_OK = new Set(['datastore', 'identity']);

const list = (d) => (fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? (e.name === 'node_modules' ? [] : list(path.join(d, e.name))) : [path.join(d, e.name)])) : []);
const isCode = (f) => /\.(jsx?|mjs)$/.test(f);
const importsOf = (f) => [...fs.readFileSync(f, 'utf8').matchAll(/(?:from\s+|import\s*\(\s*)['"]([^'"]+)['"]/g)].map((m) => m[1]);
const pkgOfSpec = (s) => (s.startsWith('@forge/') ? s.split('/')[1] : null);

const sources = [
  ...Object.keys(PACKAGES).flatMap((p) => list(path.join(PKGS, p, 'src')).filter(isCode).map((f) => ({ f, owner: p, kind: 'package' }))),
  ...list(SRC).filter(isCode).map((f) => ({ f, owner: path.relative(SRC, f).split(path.sep)[0], kind: 'app' })),
];

describe('component architecture', () => {
  it('every package and folder is a known component', () => {
    const folders = new Set(list(SRC).filter(isCode).map((f) => path.relative(SRC, f).split(path.sep)[0]).filter((x) => !x.includes('.')));
    for (const f of folders) expect(Object.keys(FOLDERS), `unknown folder src/${f}`).toContain(f);
    const pkgDirs = fs.readdirSync(PKGS, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
    for (const p of pkgDirs) expect(Object.keys(PACKAGES), `unknown package ${p}`).toContain(p);
  });

  it('packages only use the packages they declare, and the declarations match the rules', () => {
    for (const [name, allowed] of Object.entries(PACKAGES)) {
      const manifest = JSON.parse(fs.readFileSync(path.join(PKGS, name, 'package.json'), 'utf8'));
      expect(manifest.name).toBe(`@forge/${name}`);
      const declared = Object.keys({ ...manifest.dependencies, ...manifest.peerDependencies }).filter((d) => d.startsWith('@forge/')).map((d) => d.split('/')[1]);
      expect(declared.sort(), `${name} package.json`).toEqual([...allowed].sort());
    }
    const bad = [];
    for (const { f, owner, kind } of sources.filter((s) => s.kind === 'package')) {
      for (const spec of importsOf(f)) {
        const p = pkgOfSpec(spec);
        if (p && !PACKAGES[owner].includes(p)) bad.push(`${path.relative(ROOT, f)} -> ${spec}`);
        if (spec.startsWith('..')) bad.push(`${path.relative(ROOT, f)} reaches outside its package: ${spec}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('app folders only import the components they are allowed to use', () => {
    const bad = [];
    for (const { f, owner } of sources.filter((s) => s.kind === 'app')) {
      if (owner.includes('.')) continue; // main.jsx
      for (const spec of importsOf(f)) {
        const p = pkgOfSpec(spec);
        if (p) { if (!FOLDERS[owner].includes(p)) bad.push(`${path.relative(ROOT, f)} -> ${spec} (${owner} may not use ${p})`); continue; }
        if (!spec.startsWith('.')) continue;
        const target = path.relative(SRC, path.resolve(path.dirname(f), spec)).split(path.sep)[0];
        if (target === owner) continue;
        if (target.startsWith('..')) { bad.push(`${path.relative(ROOT, f)} reaches outside src: ${spec}`); continue; }
        if (!FOLDERS[owner].includes(target)) bad.push(`${path.relative(ROOT, f)} -> ${spec} (${owner} may not use ${target})`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('packages are used only through their public entry point', () => {
    const bad = [];
    for (const { f } of sources) {
      for (const spec of importsOf(f)) {
        if (spec.startsWith('@forge/') && spec.split('/').length > 2 && spec !== '@forge/ui/styles.css') bad.push(`${path.relative(ROOT, f)} -> ${spec}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('only the data store and identity packages import the Firebase SDK', () => {
    const bad = sources.filter(({ f, owner, kind }) => importsOf(f).some((s) => s === 'firebase' || s.startsWith('firebase/')) && !(kind === 'package' && FIREBASE_OK.has(owner)));
    expect(bad.map((s) => path.relative(ROOT, s.f))).toEqual([]);
  });

  it('the component graph has no cycles', () => {
    const edges = { ...PACKAGES, ...FOLDERS };
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
