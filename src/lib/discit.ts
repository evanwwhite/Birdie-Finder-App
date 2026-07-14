// Live disc catalog from the DiscIt API (https://discit-api.fly.dev) — free,
// no key, MIT-licensed, refreshed nightly from the Marshall Street flight
// guide. Same graceful-fallback pattern as weather.ts: when the network (or
// the API) is unavailable the bundled all_discs.csv seed is used instead.
import { Disc, DiscCategory } from './types';

const DISCIT_URL = 'https://discit-api.fly.dev/disc';

// DiscIt categories → the app's four bag slots.
const CATEGORY: Record<string, DiscCategory> = {
  'distance driver': 'Distance drivers',
  'hybrid driver': 'Fairway drivers',
  'control driver': 'Fairway drivers',
  'midrange': 'Midranges',
  'putter': 'Putters & approach',
  'approach': 'Putters & approach',
};

type DiscItDisc = {
  id: string; name: string; brand: string; category: string;
  speed: string; glide: string; turn: string; fade: string;
  stability: string; name_slug: string; brand_slug: string; pic: string;
};

let liveCache: Disc[] | null = null;

export async function fetchDiscItCatalog(): Promise<Disc[] | null> {
  if (liveCache) return liveCache;
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 8000);
    const res = await fetch(DISCIT_URL, { signal: ctl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const rows: DiscItDisc[] = await res.json();
    const discs = rows
      .map((r): Disc | null => {
        const category = CATEGORY[(r.category || '').toLowerCase().replace(/-/g, ' ')];
        const speed = +r.speed, glide = +r.glide, turn = +r.turn, fade = +r.fade;
        if (!r.name || !category || ![speed, glide, turn, fade].every(Number.isFinite)) return null;
        return {
          id: `${r.brand_slug || r.brand}-${r.name_slug || r.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          name: r.name, brand: r.brand, category, speed, glide, turn, fade,
          stability: undefined, // DiscIt's stability is a label, not a number; derived from turn+fade instead
          pic: r.pic || undefined,
        };
      })
      .filter((d): d is Disc => !!d);
    if (!discs.length) return null;
    liveCache = discs;
    return discs;
  } catch {
    return null; // offline / blocked — caller falls back to the bundled seed
  }
}

// Merge live DiscIt data onto the seed catalog: live entries win (fresher
// flight numbers, flight-shape image), seed-only molds are kept so the
// catalog never shrinks when a mold drops out of the guide.
export function mergeCatalogs(seed: Disc[], live: Disc[]): Disc[] {
  const byId = new Map(seed.map((d) => [d.id, d]));
  for (const d of live) {
    const existing = byId.get(d.id);
    byId.set(d.id, existing ? { ...existing, ...d, stability: existing.stability } : d);
  }
  return [...byId.values()].sort((a, b) => a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name));
}
