#!/usr/bin/env node
// Regenerate data/all_discs.csv from the DiscIt API (MIT-licensed, refreshed
// nightly from the Marshall Street flight guide). Run locally with internet:
//   node scripts/seed_discs.mjs
// The app also refreshes from DiscIt live at runtime (src/lib/discit.ts);
// this script keeps the bundled offline fallback current.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'all_discs.csv');
const CATEGORY = {
  'distance driver': 'Distance drivers',
  'hybrid driver': 'Fairway drivers',
  'control driver': 'Fairway drivers',
  'midrange': 'Midranges',
  'putter': 'Putters & approach',
  'approach': 'Putters & approach',
};

const res = await fetch('https://discit-api.fly.dev/disc');
if (!res.ok) throw new Error(`DiscIt responded ${res.status}`);
const rows = await res.json();

const esc = (v) => (/[",\n]/.test(String(v ?? '')) ? `"${String(v).replace(/"/g, '""')}"` : String(v ?? ''));
const seen = new Set();
const out = [];
for (const r of rows) {
  const category = CATEGORY[(r.category || '').toLowerCase().replace(/-/g, ' ')];
  const nums = [r.speed, r.glide, r.turn, r.fade].map(Number);
  if (!r.name || !category || nums.some((n) => !Number.isFinite(n))) continue;
  const id = `${r.brand_slug || r.brand}-${r.name_slug || r.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  if (seen.has(id)) continue;
  seen.add(id);
  out.push({ id, name: r.name, brand: r.brand, category, speed: nums[0], glide: nums[1], turn: nums[2], fade: nums[3], stability: '', pic: r.pic || '' });
}
out.sort((a, b) => a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name));

const header = ['id', 'name', 'brand', 'category', 'speed', 'glide', 'turn', 'fade', 'stability', 'pic'];
writeFileSync(OUT, [header.join(','), ...out.map((d) => header.map((h) => esc(d[h])).join(','))].join('\n') + '\n');
console.log(`Wrote ${out.length} discs to ${OUT}`);
