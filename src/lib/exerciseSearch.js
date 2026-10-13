// Search over the exercise library. Pure functions (no React) so they can be unit tested.
import { equipmentGroup, folderKeyOf } from '../data/muscleFolders';

/** Groups of interchangeable phrases: searching for one finds all of them. */
const SYNONYMS = [
  ['lat pulldown', 'pulldown', 'pull down'],
  ['pec deck', 'butterfly', 'pec fly', 'chest fly'],
  ['bench', 'bench press', 'chest press'],
  ['overhead press', 'military press', 'shoulder press'],
  ['skull crusher', 'skullcrusher', 'lying triceps extension'],
  ['rdl', 'romanian deadlift'],
  ['pull up', 'pullup', 'chin up', 'chinup'],
  ['hip thrust', 'glute bridge'],
  ['ab wheel', 'ab roller', 'rollout'],
  ['calf raise', 'calves'],
  ['abs', 'abdominals', 'core'],
  ['leg curl', 'hamstring curl'],
  ['leg extension', 'quad extension'],
  ['wrist', 'forearm'],
];

const stem = (t) => (t.length > 3 && t.endsWith('s') && !t.endsWith('ss') ? t.slice(0, -1) : t);

/** lower-case words with punctuation and hyphens removed ("Pull-Down" -> ["pull","down"]), plural "s" stripped. */
export function tokens(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean).map(stem);
}

const SYN_INDEX = SYNONYMS.map((g) => g.map((p) => tokens(p).join(' ')));

/** All phrasings of a query: the query itself plus the other members of any synonym group it contains. */
export function expandQuery(query) {
  const base = tokens(query).join(' ');
  if (!base) return [];
  const out = new Set([base]);
  for (const group of SYN_INDEX) {
    for (const phrase of group) {
      if (` ${base} `.includes(` ${phrase} `)) {
        for (const other of group) out.add(base.replace(phrase, other));
      }
    }
  }
  return [...out];
}

const cache = new WeakMap();

/** Precompute search fields once per dataset. */
export function buildIndex(data, popularSet = new Set()) {
  if (cache.has(data)) return cache.get(data);
  const index = data.map((ex) => {
    const nameTokens = tokens(ex.name);
    return {
      ex,
      folder: folderKeyOf(ex),
      group: equipmentGroup(ex.equipment),
      popular: popularSet.has(ex.id),
      nameNorm: nameTokens.join(' '),
      nameC: nameTokens.join(''),
      muscC: tokens([...(ex.primaryMuscles || []), ...(ex.secondaryMuscles || [])].join(' ')).join(''),
      eqC: tokens(ex.equipment || '').join(''),
    };
  });
  cache.set(data, index);
  return index;
}

function scoreAlt(item, alt) {
  const qt = alt.split(' ');
  const inName = qt.every((t) => item.nameC.includes(t));
  const inAll = inName || qt.every((t) => item.nameC.includes(t) || item.muscC.includes(t) || item.eqC.includes(t));
  if (!inAll) return -1;
  let s = inName ? 100 : 40;
  if (item.nameNorm === alt) s += 80;
  else if (item.nameNorm.startsWith(alt)) s += 40;
  const words = item.nameNorm.split(' ');
  s += qt.filter((t) => words.includes(t)).length * 10;
  return s;
}

/**
 * Search the library. Popular exercises always come first, then by relevance, then by shorter name.
 * Options: folder (muscle key), equipment (group name), popularOnly, limit.
 */
export function searchIndex(index, query, { folder, equipment, popularOnly, limit = 200 } = {}) {
  const alts = expandQuery(query);
  let pool = index;
  if (folder) pool = pool.filter((i) => i.folder === folder);
  if (equipment) pool = pool.filter((i) => i.group === equipment);
  if (popularOnly) pool = pool.filter((i) => i.popular);
  if (alts.length === 0) {
    return [...pool].sort(byPopularThenName).slice(0, limit).map((i) => i.ex);
  }
  const scored = [];
  for (const item of pool) {
    let best = -1;
    for (const alt of alts) best = Math.max(best, scoreAlt(item, alt));
    if (best >= 0) scored.push({ item, score: best + (item.popular ? 1000 : 0) - item.ex.name.length * 0.1 });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.item.ex);
}

function byPopularThenName(a, b) {
  if (a.popular !== b.popular) return a.popular ? -1 : 1;
  return a.ex.name.localeCompare(b.ex.name);
}

/** Exercises of one muscle folder (popular first, then A-Z). */
export const folderItems = (index, folder, opts = {}) => searchIndex(index, '', { ...opts, folder, limit: 10000 });
