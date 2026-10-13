import { describe, expect, it } from 'vitest';
import data from '../src/data/exercises.json';
import { POPULAR_IDS, POPULAR_SET } from '../src/data/popular';
import { FOLDERS, FOLDER_BY_KEY, equipmentGroup, folderKeyOf, EQUIPMENT_GROUPS } from '../src/data/muscleFolders';
import { buildIndex, expandQuery, folderItems, searchIndex, tokens } from '../src/lib/exerciseSearch';
import { datasetIdOf, imageUrls, libDocId } from '../src/lib/exerciseData';

const index = buildIndex(data, POPULAR_SET);
const names = (list) => list.map((e) => e.name);

describe('dataset integrity', () => {
  it('has unique ids that are safe Firestore doc ids', () => {
    expect(new Set(data.map((x) => x.id)).size).toBe(data.length);
    for (const x of data) expect(x.id).toMatch(/^[A-Za-z0-9_-]+$/);
  });
  it('every exercise has a name and at least one primary muscle that has a folder', () => {
    for (const x of data) {
      expect(x.name).toBeTruthy();
      expect(FOLDER_BY_KEY[folderKeyOf(x)], `${x.name} -> ${folderKeyOf(x)}`).toBeTruthy();
    }
    expect(FOLDERS.length).toBe(17);
  });
  it('popular ids all exist and the list is the intended size', () => {
    const ids = new Set(data.map((x) => x.id));
    for (const id of POPULAR_IDS) expect(ids.has(id)).toBe(true);
    expect(POPULAR_IDS.length).toBeGreaterThanOrEqual(100);
    expect(POPULAR_IDS.length).toBeLessThanOrEqual(160);
    expect(new Set(POPULAR_IDS).size).toBe(POPULAR_IDS.length);
  });
  it('groups equipment into the six chips', () => {
    for (const x of data) expect(EQUIPMENT_GROUPS).toContain(equipmentGroup(x.equipment));
    expect(equipmentGroup('machine')).toBe('Machine');
    expect(equipmentGroup('body only')).toBe('Bodyweight');
    expect(equipmentGroup(null)).toBe('Other');
  });
  it('builds image urls with a CDN first and a raw GitHub fallback', () => {
    const ex = data.find((x) => x.images.length);
    const [cdn, raw] = imageUrls(ex, 0);
    expect(cdn).toBe(`https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/${ex.images[0]}`);
    expect(raw).toContain('raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/');
    expect(imageUrls({ images: [] })).toEqual([]);
  });
  it('maps between dataset ids and Firestore doc ids', () => {
    expect(libDocId('Barbell_Curl')).toBe('lib_Barbell_Curl');
    expect(datasetIdOf('lib_Barbell_Curl')).toBe('Barbell_Curl');
    expect(datasetIdOf('abc123')).toBeNull();
  });
});

describe('search', () => {
  it('ignores punctuation, hyphens, case and plurals', () => {
    expect(tokens('Pull-Down')).toEqual(['pull', 'down']);
    expect(tokens('Calf Raises')).toEqual(['calf', 'raise']);
  });
  it('finds Lat Pulldown for "pulldown", "pull-down" and "pull down"', () => {
    for (const q of ['pulldown', 'pull-down', 'pull down', 'PULLDOWN']) {
      expect(names(searchIndex(index, q)), q).toContain('Wide-Grip Lat Pulldown');
    }
  });
  it('supports synonyms (pec deck / fly, chest press / bench)', () => {
    expect(expandQuery('pec deck')).toContain('butterfly');
    expect(names(searchIndex(index, 'pec deck'))).toContain('Butterfly');
    expect(names(searchIndex(index, 'chest press'))).toContain('Barbell Bench Press - Medium Grip');
    expect(names(searchIndex(index, 'rdl'))).toContain('Romanian Deadlift');
  });
  it('ranks popular exercises first', () => {
    const r = searchIndex(index, 'curl');
    const firstNonPopular = r.findIndex((e) => !POPULAR_SET.has(e.id));
    expect(firstNonPopular).toBeGreaterThan(5);
    expect(r.slice(0, firstNonPopular).every((e) => POPULAR_SET.has(e.id))).toBe(true);
    const lastPopular = r.map((e) => POPULAR_SET.has(e.id)).lastIndexOf(true);
    expect(lastPopular).toBeLessThan(firstNonPopular);
  });
  it('matches muscles and equipment as well as names', () => {
    expect(searchIndex(index, 'biceps').length).toBeGreaterThan(30);
    expect(searchIndex(index, 'cable').every((e) => /cable/i.test(e.name) || e.equipment === 'cable' || e.primaryMuscles.concat(e.secondaryMuscles).some((m) => /cable/.test(m)))).toBe(true);
  });
  it('returns nothing for nonsense and everything (popular first) for an empty query', () => {
    expect(searchIndex(index, 'zzzzqqq')).toEqual([]);
    const all = searchIndex(index, '', { limit: 10000 });
    expect(all.length).toBe(data.length);
    expect(POPULAR_SET.has(all[0].id)).toBe(true);
  });
  it('filters by folder, equipment and popular only', () => {
    const chest = folderItems(index, 'chest');
    expect(chest.every((e) => folderKeyOf(e) === 'chest')).toBe(true);
    const popularChest = folderItems(index, 'chest', { popularOnly: true });
    expect(popularChest.length).toBeGreaterThan(5);
    expect(popularChest.length).toBeLessThan(chest.length);
    expect(popularChest.every((e) => POPULAR_SET.has(e.id))).toBe(true);
    const machine = folderItems(index, 'chest', { equipment: 'Machine' });
    expect(machine.every((e) => equipmentGroup(e.equipment) === 'Machine')).toBe(true);
  });
  it('every folder has popular exercises except the tiny ones', () => {
    for (const f of FOLDERS) {
      const n = folderItems(index, f.key, { popularOnly: true }).length;
      if (!['neck', 'lower back', 'glutes', 'traps'].includes(f.key)) expect(n, f.key).toBeGreaterThan(0);
    }
  });
});
