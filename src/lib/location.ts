// Location precedence (matches web app): manual override -> cached fix (30m) -> GPS -> default.
// The fix always carries provenance so the UI never implies accuracy it doesn't have.
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocFix } from './types';
import { haversineFt } from './prng';

const KEY = 'bf_loc_v1';
const TTL = 30 * 60 * 1000;
const DEFAULT: LocFix = { lat: 45.5231, lng: -122.6765, provenance: 'default' }; // Portland, OR (web default)

export async function resolveLocation(): Promise<LocFix> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const { ts, v } = JSON.parse(raw);
      if (v.provenance === 'manual' || Date.now() - ts < TTL) return v;
    }
  } catch {}
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      // A fresh GPS fix can take 30–60s; never make the UI wait on it.
      // Prefer the OS's cached position (instant), and cap the fresh fix at 4s.
      const timeout = new Promise<null>((r) => setTimeout(() => r(null), 4000));
      const pos =
        (await Location.getLastKnownPositionAsync({ maxAge: TTL }).catch(() => null)) ??
        (await Promise.race([Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }), timeout]).catch(() => null));
      if (pos) {
        const fix: LocFix = {
          lat: pos.coords.latitude, lng: pos.coords.longitude,
          provenance: 'gps', accuracyFt: Math.round((pos.coords.accuracy ?? 30) * 3.28084),
        };
        await AsyncStorage.setItem(KEY, JSON.stringify({ ts: Date.now(), v: fix }));
        return fix;
      }
      // Timed out: refresh the cache in the background for the next caller.
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
        .then((p) => AsyncStorage.setItem(KEY, JSON.stringify({ ts: Date.now(), v: {
          lat: p.coords.latitude, lng: p.coords.longitude,
          provenance: 'gps', accuracyFt: Math.round((p.coords.accuracy ?? 30) * 3.28084),
        } })))
        .catch(() => {});
    }
  } catch {}
  return DEFAULT;
}

export async function setManualLocation(fix: Omit<LocFix, 'provenance'>) {
  const v: LocFix = { ...fix, provenance: 'manual' };
  await AsyncStorage.setItem(KEY, JSON.stringify({ ts: Date.now(), v }));
  return v;
}

export function fixLabel(fix: LocFix) {
  switch (fix.provenance) {
    case 'gps': return { text: `GPS · ±${fix.accuracyFt ?? 30}ft`, ok: true };
    case 'manual': return { text: 'Manual location', ok: true };
    case 'ip': return { text: 'IP-based', ok: false };
    default: return { text: 'Approximate', ok: false };
  }
}

// Live GPS-to-basket readout for the hole card
export function watchToBasket(target: { lat: number; lng: number }, cb: (ft: number) => void) {
  let sub: Location.LocationSubscription | undefined;
  Location.watchPositionAsync(
    { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 2 },
    (pos) => cb(Math.max(0, Math.round(haversineFt(pos.coords.latitude, pos.coords.longitude, target.lat, target.lng))))
  ).then((s) => (sub = s)).catch(() => {});
  return () => sub?.remove();
}
