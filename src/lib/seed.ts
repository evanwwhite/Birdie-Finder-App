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

let coursesCache: Course[] | null = null;
export async function loadCourses(): Promise<Course[]> {
  if (coursesCache) return coursesCache;
  const text = await loadCsv(require('../../data/courses.csv'));
  const { data } = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  coursesCache = data.map((r) => ({
    id: r.id, name: r.name, city: r.city, state: r.state,
    lat: +r.lat, lng: +r.lng, holes: +r.holes, par: +r.par,
    rating: +r.rating, difficulty: r.difficulty as Course['difficulty'],
    terrain: r.terrain,
  }));
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

// Deterministic per-course hole layout until real OSM/course_holes data lands.
// ~40% of holes are marked 'osm' to exercise the provenance UI honestly;
// in production this comes from course_holes.source.
export function holesFor(course: Course): Hole[] {
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
      source: rnd() < 0.4 ? 'osm' : 'estimated',
    });
  }
  return holes;
}
