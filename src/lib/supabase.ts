import 'react-native-url-polyfill/auto';
// One backend, two clients (BUILD_PLAN §2). Set EXPO_PUBLIC_SUPABASE_URL and
// EXPO_PUBLIC_SUPABASE_ANON_KEY in .env. Until configured, the app runs fully
// offline against the bundled seed CSVs — matching Phase 1's offline-first bar.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabaseEnabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase: SupabaseClient | null = supabaseEnabled
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
    })
  : null;

/** Realtime shared scorecard (BUILD_PLAN §4).
 * Each player scores only themselves; every stroke is an upsert on hole_scores
 * broadcast on the round's channel so all phones update at once. */
export function subscribeToRound(
  roundId: string,
  onScore: (row: { player_id: string | null; guest_name: string | null; hole: number; strokes: number }) => void
) {
  if (!supabase) return () => {};
  const channel = supabase
    .channel(`round:${roundId}`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'hole_scores', filter: `round_id=eq.${roundId}` },
      (payload) => onScore(payload.new as any))
    .subscribe();
  return () => { supabase!.removeChannel(channel); };
}

export async function pushScore(roundId: string, playerId: string | null, guestName: string | null, hole: number, par: number, strokes: number) {
  if (!supabase) return; // offline: local store is the source of truth; sync layer replays later
  await supabase.from('hole_scores').upsert(
    { round_id: roundId, player_id: playerId, guest_name: guestName, hole, par, strokes },
    { onConflict: 'round_id,player_id,guest_name,hole' }
  );
}
