export type Course = {
  id: string; name: string; city: string; state: string;
  lat: number; lng: number; holes: number; par: number;
  rating: number; difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  terrain: string; distanceMi?: number;
};

export type Hole = { hole: number; par: number; distFt: number; elevFt: number; source: 'osm' | 'estimated' };

export type Disc = {
  id: string; name: string; brand: string; category: DiscCategory;
  speed: number; glide: number; turn: number; fade: number;
};
export type DiscCategory = 'Distance drivers' | 'Fairway drivers' | 'Midranges' | 'Putters & approach';

export type Player = { id: string; name: string; initials: string; guest?: boolean };

export type LocFix = {
  lat: number; lng: number;
  provenance: 'gps' | 'ip' | 'manual' | 'default';
  accuracyFt?: number;
};
