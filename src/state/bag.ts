// User's bag — server table `bags` in production; persisted locally (bf_bag_v1).
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Disc } from '@/lib/types';

type BagState = {
  discs: Disc[];
  seeded: boolean; // set once the starter bag has been offered, so an emptied bag stays empty
  add: (d: Disc) => void;
  remove: (id: string) => void;
  seedIfEmpty: (starter: Disc[]) => void;
};

export const useBag = create<BagState>()(
  persist(
    (set, get) => ({
      discs: [],
      seeded: false,
      add: (d) => set({ discs: [...get().discs, d] }),
      remove: (id) => set({ discs: get().discs.filter((x) => x.id !== id) }),
      seedIfEmpty: (starter) => { if (!get().seeded && !get().discs.length) set({ discs: starter, seeded: true }); },
    }),
    { name: 'bf_bag_v1', storage: createJSONStorage(() => AsyncStorage) }
  )
);

// Seed only after AsyncStorage rehydration, so the starter bag never races
// (or clobbers) a previously persisted bag.
export function seedBag(starter: Disc[]) {
  const run = () => useBag.getState().seedIfEmpty(starter);
  if (useBag.persist.hasHydrated()) run();
  else useBag.persist.onFinishHydration(run);
}
