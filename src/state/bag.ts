// User's bag — server table `bags` in production; persisted locally (bf_bag_v1).
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Disc } from '@/lib/types';

type BagState = {
  discs: Disc[];
  add: (d: Disc) => void;
  remove: (id: string) => void;
  seedIfEmpty: (starter: Disc[]) => void;
};

export const useBag = create<BagState>()(
  persist(
    (set, get) => ({
      discs: [],
      add: (d) => set({ discs: [...get().discs, d] }),
      remove: (id) => set({ discs: get().discs.filter((x) => x.id !== id) }),
      seedIfEmpty: (starter) => { if (!get().discs.length) set({ discs: starter }); },
    }),
    { name: 'bf_bag_v1', storage: createJSONStorage(() => AsyncStorage) }
  )
);
