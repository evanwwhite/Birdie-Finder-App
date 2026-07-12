// Offline-first live round state (BUILD_PLAN §5).
// All writes hit AsyncStorage first (bf_round_live_v1); completed rounds append
// to bf_rounds_v1. Supabase sync (pushScore) is fire-and-forget on top.
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Player, Hole, Course } from '@/lib/types';
import { pushScore } from '@/lib/supabase';

export type SavedRound = {
  id: string; courseId: string; courseName: string; layout: string;
  playedAt: string; holes: number; par: number; total: number; relPar: number;
  scores: Record<string, Record<number, number>>; players: Player[]; pars: number[];
};

type RoundState = {
  live: null | {
    id: string; courseId: string; courseName: string; layout: string;
    startedAt: string; players: Player[]; pars: number[]; holes?: Hole[];
    scores: Record<string, Record<number, number>>; // playerId -> hole -> strokes
    cur: number; throwing: string;
  };
  history: SavedRound[];
  startRound: (course: Course, layout: string, holes: Hole[], players: Player[]) => void;
  setScore: (playerId: string, hole: number, strokes: number) => void;
  applyRemoteScore: (playerId: string, hole: number, strokes: number) => void;
  setHole: (hole: number) => void;
  setThrowing: (playerId: string) => void;
  finishRound: () => SavedRound | null;
  abandonRound: () => void;
};

const uid = () => Math.random().toString(36).slice(2, 10);

export const useRound = create<RoundState>()(
  persist(
    (set, get) => ({
      live: null,
      history: [],
      startRound: (course, layout, holes, players) =>
        set({
          live: {
            id: uid(), courseId: course.id, courseName: course.name, layout,
            startedAt: new Date().toISOString(), players,
            pars: holes.map((h) => h.par), holes,
            scores: Object.fromEntries(players.map((p) => [p.id, {}])),
            cur: 1, throwing: players[0].id,
          },
        }),
      setScore: (playerId, hole, strokes) => {
        const live = get().live; if (!live) return;
        const s = Math.min(12, Math.max(1, strokes));
        const scores = { ...live.scores, [playerId]: { ...live.scores[playerId], [hole]: s } };
        set({ live: { ...live, scores } });
        const p = live.players.find((x) => x.id === playerId);
        pushScore(live.id, p?.guest ? null : playerId, p?.guest ? p.name : null, hole, live.pars[hole - 1], s);
      },
      applyRemoteScore: (playerId, hole, strokes) => {
        const live = get().live; if (!live) return;
        set({ live: { ...live, scores: { ...live.scores, [playerId]: { ...live.scores[playerId], [hole]: strokes } } } });
      },
      setHole: (hole) => { const live = get().live; if (live) set({ live: { ...live, cur: Math.min(live.pars.length, Math.max(1, hole)) } }); },
      setThrowing: (playerId) => { const live = get().live; if (live) set({ live: { ...live, throwing: playerId } }); },
      finishRound: () => {
        const live = get().live; if (!live) return null;
        const you = live.players[0];
        const total = live.pars.reduce((t, _, i) => t + (live.scores[you.id][i + 1] ?? live.pars[i]), 0);
        const saved: SavedRound = {
          id: live.id, courseId: live.courseId, courseName: live.courseName, layout: live.layout,
          playedAt: new Date().toISOString(), holes: live.pars.length,
          par: live.pars.reduce((a, b) => a + b, 0), total,
          relPar: total - live.pars.reduce((a, b) => a + b, 0),
          scores: live.scores, players: live.players, pars: live.pars,
        };
        set({ live: null, history: [saved, ...get().history] });
        return saved;
      },
      abandonRound: () => set({ live: null }),
    }),
    { name: 'bf_rounds_v1', storage: createJSONStorage(() => AsyncStorage) }
  )
);

export function playerTotals(scores: Record<number, number>, pars: number[]) {
  let total = 0, rel = 0, thru = 0;
  pars.forEach((par, i) => {
    const s = scores[i + 1];
    if (s != null) { total += s; rel += s - par; thru = i + 1; }
  });
  return { total, rel, thru };
}
