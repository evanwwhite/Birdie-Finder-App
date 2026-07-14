// Terrain elevation from Open-Meteo's free Elevation API — same keyless model
// as the weather endpoint already used by weather.ts. One batched request per
// course (up to ~100 coordinates), graceful null on failure.
const M_TO_FT = 3.28084;

export async function fetchElevationsFt(points: { lat: number; lng: number }[]): Promise<(number | null)[] | null> {
  if (!points.length) return [];
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 8000);
    const res = await fetch(
      `https://api.open-meteo.com/v1/elevation?latitude=${points.map((p) => p.lat.toFixed(6)).join(',')}` +
      `&longitude=${points.map((p) => p.lng.toFixed(6)).join(',')}`,
      { signal: ctl.signal }
    );
    clearTimeout(t);
    if (!res.ok) return null;
    const j = await res.json();
    if (!Array.isArray(j.elevation)) return null;
    return points.map((_, i) => (Number.isFinite(j.elevation[i]) ? j.elevation[i] * M_TO_FT : null));
  } catch {
    return null; // offline — holes keep their seeded elevation
  }
}
