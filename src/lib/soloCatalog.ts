import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import type { PlayableCourse } from '@/state/round';

// The local fixture is read from the development server, never bundled.
export const internalCourses: PlayableCourse[] = [];

const db = SQLite.openDatabaseSync('birdie_catalog_v1.db');
db.execSync(`CREATE TABLE IF NOT EXISTS playable_cache (
  course_id TEXT PRIMARY KEY, data_version TEXT NOT NULL, detail_json TEXT NOT NULL,
  cached_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  favorite INTEGER NOT NULL DEFAULT 0
);`);
if (!db.getAllSync<{ name: string }>('PRAGMA table_info(playable_cache)').some(c => c.name === 'favorite'))
  db.execSync('ALTER TABLE playable_cache ADD COLUMN favorite INTEGER NOT NULL DEFAULT 0');

export type Detail = { id: string; name: string; data_version: string; reported_hole_count: number | null;
  synthetic?: boolean;
  layouts: Array<{ name: string; versions: Array<{ id: string; holes: Array<{
    id: string; hole_number: number; par: number | null; distance_ft: number | null }> }> }> };
function playable(d: Detail): PlayableCourse | null {
  const layout = d.layouts.find(l => l.versions.some(v => v.holes.length));
  const version = layout?.versions.find(v => v.holes.length);
  const holes = version ? version.holes.map(h => ({ hole: h.hole_number, par: h.par,
    distFt: h.distance_ft, sourceLayoutHoleId: h.id })) :
    Array.from({ length: d.reported_hole_count ?? 0 }, (_, i) => ({
      hole: i + 1, par: null, distFt: null, sourceLayoutHoleId: null }));
  if (!holes.length || holes.some((h, i) => h.hole !== i + 1)) return null;
  return { id: d.id, name: d.name, dataVersion: d.data_version,
    layout: layout?.name ?? 'Private custom layout', layoutVersionId: version?.id ?? null, holes };
}
function cached(): PlayableCourse[] {
  return db.getAllSync<{ detail_json: string }>('SELECT detail_json FROM playable_cache ORDER BY favorite DESC,cached_at DESC LIMIT 50')
    .flatMap(row => { try { const d = JSON.parse(row.detail_json) as Detail;
      if (d.synthetic && !__DEV__) return [];
      const c = playable(d); return c ? [c] : []; } catch { return []; } });
}
export function saveFavoriteCourse(detail: Detail): boolean {
  if (!playable(detail) || detail.synthetic) return false;
  db.withTransactionSync(() => {
    db.runSync(`INSERT INTO playable_cache(course_id,data_version,detail_json,cached_at,favorite)
      VALUES(?,?,?,CURRENT_TIMESTAMP,1) ON CONFLICT(course_id) DO UPDATE SET
      data_version=excluded.data_version,detail_json=excluded.detail_json,cached_at=CURRENT_TIMESTAMP,favorite=1`,
      detail.id,detail.data_version,JSON.stringify(detail));
    db.runSync(`DELETE FROM playable_cache WHERE course_id NOT IN
      (SELECT course_id FROM playable_cache ORDER BY favorite DESC,cached_at DESC,course_id LIMIT 50)`);
  });
  return true;
}

async function devFixtures(): Promise<Detail[]> {
  if (!__DEV__ || !supabase) return [];
  const rows = await supabase.from('courses').select('id,name,data_version,reported_hole_count')
    .eq('published',true).eq('synthetic',true);
  if (rows.error || !rows.data?.length) return [];
  const [layouts,versions,holes] = await Promise.all([
    supabase.from('layouts').select('id,course_id,name'),
    supabase.from('layout_versions').select('id,layout_id,version_no').eq('published',true),
    supabase.from('layout_holes').select('id,layout_version_id,hole_number,par,distance_ft').order('hole_number'),
  ]);
  if (layouts.error || versions.error || holes.error) return [];
  return rows.data.map(c => ({ ...c,synthetic:true,layouts:(layouts.data ?? [])
    .filter(l => l.course_id === c.id).map(l => ({name:l.name,versions:(versions.data ?? [])
      .filter(v => v.layout_id === l.id).map(v => ({id:v.id,holes:(holes.data ?? [])
        .filter(h => h.layout_version_id === v.id)}))})) }));
}

export async function loadSoloCourses(lat?: number, lon?: number): Promise<PlayableCourse[]> {
  if (lat == null || lon == null) {
    try { const stored = await AsyncStorage.getItem('bf_catalog_near_v1');
      if (stored) { const parsed = JSON.parse(stored);
        if (Number.isFinite(parsed.lat) && Number.isFinite(parsed.lon)) { lat = parsed.lat; lon = parsed.lon; }
      }
    } catch { /* Fall back to name order or the existing offline cache. */ }
  }
  if (supabase) {
    const page = await supabase.rpc('search_courses_v1', {
      p_query: '', p_lat: lat ?? null, p_lon: lon ?? null, p_limit: 50, p_offset: 0,
    });
    if (!page.error && Array.isArray(page.data?.items)) {
      const ids = page.data.items.map((c: { id: string }) => c.id);
      const favorites = db.getAllSync<{ course_id: string }>(
        'SELECT course_id FROM playable_cache WHERE favorite = 1 ORDER BY cached_at DESC LIMIT 50')
        .map(row => row.course_id).filter(id => !ids.includes(id));
      const details = await Promise.all([...ids,...favorites].map(async id => {
        const result = await supabase!.rpc('get_course_detail_v1', { p_id: id });
        return result.error ? null : result.data as Detail | null;
      }));
      db.withTransactionSync(() => {
        for (const d of details) {
          if (!d || !playable(d)) continue;
          db.runSync(`INSERT INTO playable_cache(course_id,data_version,detail_json,cached_at)
            VALUES(?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(course_id) DO UPDATE SET
            data_version=excluded.data_version,detail_json=excluded.detail_json,cached_at=CURRENT_TIMESTAMP`,
            d.id, d.data_version, JSON.stringify(d));
        }
        db.runSync(`DELETE FROM playable_cache WHERE course_id NOT IN
          (SELECT course_id FROM playable_cache ORDER BY favorite DESC,cached_at DESC,course_id LIMIT 50)`);
      });
      const available = details.flatMap(d => { const c = d && playable(d); return c ? [c] : []; });
      if (available.length) return available;
    }
  }
  if (__DEV__) {
    const demo = await devFixtures();
    if (demo.length) {
      db.withTransactionSync(() => {
        for (const d of demo) db.runSync(`INSERT INTO playable_cache(course_id,data_version,detail_json,cached_at)
          VALUES(?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(course_id) DO UPDATE SET
          data_version=excluded.data_version,detail_json=excluded.detail_json,cached_at=CURRENT_TIMESTAMP`,
          d.id,d.data_version,JSON.stringify(d));
      });
      return demo.flatMap(d => { const c = playable(d); return c ? [c] : []; });
    }
  }
  const offline = cached();
  return offline.length ? offline : internalCourses;
}
