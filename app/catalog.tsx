// Disc catalog (seeded from all_discs.csv) — the "add a disc" flow from Bag.
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Serif, Body, Mono } from '@/components/Type';
import { useToast } from '@/components/Toast';
import { C, GUTTER, R, shadow, F } from '@/theme/tokens';
import { loadDiscs } from '@/lib/seed';
import { useBag } from '@/state/bag';
import { Disc } from '@/lib/types';

export default function Catalog() {
  const router = useRouter();
  const toast = useToast();
  const add = useBag((s) => s.add);
  const inBag = useBag((s) => s.discs);
  const [all, setAll] = useState<Disc[]>([]);
  const [q, setQ] = useState('');
  useEffect(() => { loadDiscs().then(setAll); }, []);

  const list = useMemo(() => all.filter((d) => (d.name + d.brand).toLowerCase().includes(q.toLowerCase())), [all, q]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.paper }} edges={['top']}>
      <View style={{ paddingHorizontal: GUTTER, paddingVertical: 8, gap: 10 }}>
        <Serif size={20}>Add a disc</Serif>
        <TextInput value={q} onChangeText={setQ} placeholder="Search discs or brands" placeholderTextColor={C.muted}
          style={{ backgroundColor: C.tile, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontFamily: F.sansMed, fontSize: 14, color: C.text }} />
      </View>
      <FlatList
        data={list}
        keyExtractor={(d) => d.id}
        contentContainerStyle={{ paddingHorizontal: GUTTER, gap: 8, paddingBottom: 40 }}
        renderItem={({ item: d }) => {
          const owned = inBag.some((x) => x.id === d.id);
          return (
            <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderRadius: R.card, borderWidth: 1, borderColor: C.border, padding: 10 }, shadow.card]}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.tintGreen, alignItems: 'center', justifyContent: 'center' }}>
                <Serif size={15} weight="800" color={C.forest2}>{String(d.speed)}</Serif>
              </View>
              <View style={{ flex: 1 }}>
                <Body size={14} weight="600" color={C.textStrong}>{d.name}</Body>
                <Mono size={9} color={C.muted}>{d.brand} · {d.speed}/{d.glide}/{d.turn}/{d.fade}</Mono>
              </View>
              <Pressable disabled={owned} onPress={() => { add(d); toast(`${d.name} added to your bag`); }}
                style={{ backgroundColor: owned ? C.tile : C.clay, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 }}>
                <Body size={13} weight="700" color={owned ? C.muted : C.paper}>{owned ? 'In bag' : 'Add'}</Body>
              </Pressable>
            </View>
          );
        }}
      />
      <Pressable onPress={() => router.back()} style={{ margin: GUTTER, borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: C.forest }}>
        <Body size={15} weight="700" color={C.forest}>Done</Body>
      </Pressable>
    </SafeAreaView>
  );
}
