#!/usr/bin/env node
// Enrich data/course_holes.csv with OSM tee/basket coordinates, tee→basket
// straight-line distance (fills holes whose fairway way had no usable length),
// and real per-hole elevation change from Open-Meteo's free Elevation API.
// Run locally with internet (takes a few minutes — it is polite to Overpass):
//   node scripts/enrich_course_holes.mjs
//
// Output columns: courseId,hole,par,distFt,source,elevFt,teeLat,teeLon,basketLat,basketLon
// The app reads elevFt directly and can recompute elevation at runtime from
// the coordinates (src/lib/seed.ts enrichHoleElevations).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const DATA = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
const RADIUS_M = 1000;
const M_TO_FT = 3.28084;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parseCsv(text) {
  const [head, ...lines] = text.trim().split(/\r?\n/);
  const cols = head.split(',').map((c) => c.replace(/^"|"$/g, ''));
  return lines.map((l) => {
    const cells = l.match(/("([^"]|"")*"|[^,]*)(,|$)/g).map((c) => c.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"'));
    return Object.fromEntries(cols.map((c, i) => [c, cells[i] ?? '']));
  });
}

function haversineFt(lat1, lon1, lat2, lon2) {
  const R = 20902231, toR = Math.PI / 180;
  const dLat = (lat2 - lat1) * toR, dLon = (lon2 - lon1) * toR;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * toR) * Math.cos(lat2 * toR) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

async function overpass(query) {
  let lastErr;
  // 429/504 means the endpoint is throttling us, not that the query is bad —
  // back off and retry (30s, 60s, 120s) before giving up on a course.
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt) {
      const wait = 30_000 * 2 ** (attempt - 1);
      process.stdout.write(`throttled, waiting ${wait / 1000}s ... `);
      await sleep(wait);
    }
    let throttled = false;
    for (const ep of OVERPASS) {
      try {
        const r = await fetch(ep, { method: 'POST', body: new URLSearchParams({ data: query }) });
        if (!r.ok) { throttled ||= r.status === 429 || r.status === 504; throw new Error(`overpass ${r.status}`); }
        return await r.json();
      } catch (e) { lastErr = e; }
    }
    if (!throttled) break;
  }
  throw lastErr;
}

async function elevationsFt(points) {
  if (!points.length) return [];
  const r = await fetch(
    `https://api.open-meteo.com/v1/elevation?latitude=${points.map((p) => p.lat.toFixed(6)).join(',')}` +
    `&longitude=${points.map((p) => p.lon.toFixed(6)).join(',')}`
  );
  if (!r.ok) throw new Error(`open-meteo ${r.status}`);
  const j = await r.json();
  return points.map((_, i) => (Number.isFinite(j.elevation?.[i]) ? j.elevation[i] * M_TO_FT : null));
}

const holes = parseCsv(readFileSync(join(DATA, 'course_holes.csv'), 'utf8'));
const courses = new Map(parseCsv(readFileSync(join(DATA, 'courses.csv'), 'utf8')).map((c) => [c.id, c]));
const byCourse = new Map();
for (const h of holes) {
  if (!byCourse.has(h.courseId)) byCourse.set(h.courseId, []);
  byCourse.get(h.courseId).push(h);
}

let done = 0, enriched = 0;
for (const [courseId, courseHoles] of byCourse) {
  done++;
  const c = courses.get(courseId);
  if (!c) continue;
  const { latitude: lat, longitude: lon } = c;
  process.stdout.write(`[${done}/${byCourse.size}] ${courseId} ... `);
  if (courseHoles.some((h) => h.teeLat)) { console.log('already enriched, skipped'); continue; }
  let json;
  try {
    json = await overpass(
      `[out:json][timeout:25];(node(around:${RADIUS_M},${lat},${lon})["disc_golf"~"^(tee|basket)$"];);out;`
    );
  } catch (e) {
    console.log(`overpass failed (${e.message}), skipped`);
    await sleep(2000);
    continue;
  }

  // Pair tees and baskets by hole ref; when a ref repeats (long/short tees),
  // keep the one nearest the course centre — same rule the web app uses.
  const tees = new Map(), baskets = new Map();
  for (const el of json.elements || []) {
    const t = el.tags || {};
    const n = /^\d+$/.test(t.ref || '') ? Number(t.ref) : null;
    if (!n || n > 36) continue;
    const bag = t.disc_golf === 'tee' ? tees : baskets;
    const prev = bag.get(n);
    if (!prev || haversineFt(lat, lon, el.lat, el.lon) < haversineFt(lat, lon, prev.lat, prev.lon)) {
      bag.set(n, { lat: el.lat, lon: el.lon });
    }
  }

  const targets = courseHoles.filter((h) => tees.has(+h.hole) && baskets.has(+h.hole));
  if (targets.length) {
    const points = targets.flatMap((h) => [tees.get(+h.hole), baskets.get(+h.hole)]);
    let elevs = null;
    try { elevs = await elevationsFt(points); } catch (e) { console.log(`(elevation failed: ${e.message})`); }
    targets.forEach((h, i) => {
      const tee = tees.get(+h.hole), basket = baskets.get(+h.hole);
      h.teeLat = tee.lat.toFixed(7); h.teeLon = tee.lon.toFixed(7);
      h.basketLat = basket.lat.toFixed(7); h.basketLon = basket.lon.toFixed(7);
      // tee→basket straight line: a floor for the true playing line, but real
      // geometry — use it only where the way-derived length was missing.
      if (!h.distFt) h.distFt = String(Math.round(haversineFt(tee.lat, tee.lon, basket.lat, basket.lon)));
      if (elevs && elevs[i * 2] != null && elevs[i * 2 + 1] != null) {
        h.elevFt = String(Math.round(elevs[i * 2 + 1] - elevs[i * 2]));
      }
      enriched++;
    });
    console.log(`${targets.length} holes enriched`);
  } else {
    console.log('no tee/basket pairs in OSM');
  }
  await sleep(1500); // stay polite to Overpass
}

const header = ['courseId', 'hole', 'par', 'distFt', 'source', 'elevFt', 'teeLat', 'teeLon', 'basketLat', 'basketLon'];
writeFileSync(
  join(DATA, 'course_holes.csv'),
  [header.join(','), ...holes.map((h) => header.map((k) => h[k] ?? '').join(','))].join('\n') + '\n'
);
console.log(`Done — ${enriched} holes enriched across ${byCourse.size} courses.`);
