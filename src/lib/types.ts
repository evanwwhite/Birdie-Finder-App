export type Course = {
  id: string; name: string; city: string; state: string;
  lat: number; lng: number; holes: number;
  par: number; parEstimated: boolean; // full directory has no par; holes×3 estimate, flagged for provenance
  rating?: number; difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
  terrain?: string; distanceMi?: number;
};

export type Hole = {
  hole: number; par: number; distFt: number; elevFt: number;
  source: 'osm' | 'estimated';
  elevSource?: 'osm' | 'estimated'; // 'osm' = tee/basket terrain elevation (Open-Meteo over OSM coords)
};

export type Disc = {
  id: string; name: string; brand: string; category: DiscCategory;
  speed: number; glide: number; turn: number; fade: number;
  stability?: number; // numeric stability where the source provides one
  pic?: string;       // flight-shape image URL (DiscIt / Marshall Street flight guide)
};
export type DiscCategory = 'Distance drivers' | 'Fairway drivers' | 'Midranges' | 'Putters & approach';

export function stabilityLabel(d: Disc): 'Understable' | 'Stable' | 'Overstable' {
  const s = d.stability ?? d.turn + d.fade;
  return s <= -1 ? 'Understable' : s >= 2 ? 'Overstable' : 'Stable';
}

export type Player = { id: string; name: string; initials: string; guest?: boolean };

export type LocFix = {
  lat: number; lng: number;
  provenance: 'gps' | 'ip' | 'manual' | 'default';
  accuracyFt?: number;
};
