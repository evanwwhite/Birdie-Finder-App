// Offline seed data. BUILD_PLAN §8: courses.csv / all_discs.csv seed the catalog.
// On device they are bundled and parsed with PapaParse as the offline fallback;
// Supabase (when configured) is the live source.
import Papa from 'papaparse';
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { Course, Disc, DiscCategory, Hole } from './types';
import { seeded } from './prng';

async function loadCsv(mod: number): Promise<string> {
  const asset = Asset.fromModule(mod);
  await asset.downloadAsync();
  return new File(asset.localUri!).text();
}

// Real per-hole layouts extracted from OpenStreetMap (par tags + way geometry),
// keyed by course id. Populated by loadCourses(); holesFor falls back to the
// deterministic estimate for courses OSM hasn't mapped.
const realHoles = new Map<string, { hole: number; par?: number; distFt?: number }[]>();

let coursesCache: Course[] | null = null;
export async function loadCourses(): Promise<Course[]> {
  if (coursesCache) return coursesCache;
  try {
    const holesText = await loadCsv(require('../../data/course_holes.csv'));
    const parsed = Papa.parse<Record<string, string>>(holesText, { header: true, skipEmptyLines: true });
    for (const r of parsed.data) {
      const list = realHoles.get(r.courseId) ?? [];
      list.push({ hole: +r.hole, par: +r.par || undefined, distFt: +r.distFt || undefined });
      realHoles.set(r.courseId, list);
    }
  } catch {
    // hole layouts are optional; courses still load without them
  }
  const text = await loadCsv(require('../../data/courses.csv'));
  const { data } = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  // Handles both the full web-repo directory (holeCount/latitude/longitude, no
  // par/difficulty/terrain) and the original hand-made subset schema.
  coursesCache = data
    .map((r): Course => {
      const holes = +(r.holes ?? r.holeCount) || 0;
      const par = +r.par || 0;
      return {
        id: r.id, name: (r.name ?? '').trim(), city: (r.city ?? '').trim(), state: (r.state ?? '').trim(),
        lat: +(r.lat ?? r.latitude), lng: +(r.lng ?? r.longitude), holes,
        par: par || holes * 3, parEstimated: !par,
        rating: r.rating ? +r.rating : undefined,
        difficulty: (r.difficulty as Course['difficulty']) || undefined,
        terrain: r.terrain || undefined,
      };
    })
    .filter((c) => c.id && c.name && Number.isFinite(c.lat) && Number.isFinite(c.lng) && c.holes > 0);
  return coursesCache;
}

let discsCache: Disc[] | null = null;
export async function loadDiscs(): Promise<Disc[]> {
  if (discsCache) return discsCache;
  const text = await loadCsv(require('../../data/all_discs.csv'));
  const { data } = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  discsCache = data.map((r) => ({
    id: r.id, name: r.name, brand: r.brand, category: r.category as DiscCategory,
    speed: +r.speed, glide: +r.glide, turn: +r.turn, fade: +r.fade,
  }));
  return discsCache;
}

export function holesFor(course: Course): Hole[] {
  const real = realHoles.get(course.id);
  if (real && real.length >= course.holes * 0.75) {
    const byNum = new Map(real.map((h) => [h.hole, h]));
    const rnd = seeded(course.id + course.name);
    const holes: Hole[] = [];
    for (let i = 1; i <= course.holes; i++) {
      const h = byNum.get(i);
      const distFt = h?.distFt ?? Math.round(260 + rnd() * 140);
      // par from OSM when tagged, else derived from real length
      const par = h?.par ?? (distFt < 400 ? 3 : distFt < 620 ? 4 : 5);
      holes.push({ hole: i, par, distFt, elevFt: 0, source: h?.distFt ? 'osm' : 'estimated' });
    }
    return holes;
  }
  return estimatedHolesFor(course);
}

// Deterministic estimate for courses OSM hasn't mapped yet.
function estimatedHolesFor(course: Course): Hole[] {
  const rnd = seeded(course.id + course.name);
  const holes: Hole[] = [];
  let parLeft = course.par;
  for (let i = 1; i <= course.holes; i++) {
    const remaining = course.holes - i;
    let par = 3;
    if (parLeft - remaining * 3 >= 2 && rnd() > 0.6) par = 4;
    if (parLeft - remaining * 3 >= 3 && rnd() > 0.88) par = 5;
    par = Math.min(Math.max(par, 3), Math.max(3, parLeft - remaining * 3));
    parLeft -= par;
    holes.push({
      hole: i,
      par,
      distFt: Math.round((par === 3 ? 240 : par === 4 ? 360 : 520) + rnd() * 120),
      elevFt: Math.round((rnd() - 0.5) * 40),
      source: 'estimated',
    });
  }
  return holes;
}
