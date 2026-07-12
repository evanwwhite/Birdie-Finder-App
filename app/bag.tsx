import React, { useEffect } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Serif, Body, Mono } from '@/components/Type';
import { C, GUTTER, R, shadow } from '@/theme/tokens';
import { useBag, seedBag } from '@/state/bag';
import { loadDiscs } from '@/lib/seed';
import { DiscCategory } from '@/lib/types';

const CATS: DiscCategory[] = ['Distance drivers', 'Fairway drivers', 'Midranges', 'Putters & approach'];

function FlightBox({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ alignItems: 'center', backgroundColor: C.tile3, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 4, minWidth: 34 }}>
      <Body size={12} weight="700" color={C.textStrong}>{String(value)}</Body>
      <Mono size={7} color={C.muted}>{label}</Mono>
    </View>
  );
}

export default function Bag() {
  const router = useRouter();
  const { discs, remove } = useBag();
  useEffect(() => { loadDiscs().then((d) => seedBag(d.slice(0, 8))); }, []);

  const avgSpeed = discs.length ? (discs.reduce((a, d) => a + d.speed, 0) / discs.length).toFixed(1) : '—';
  const nCats = new Set(discs.map((d) => d.category)).size;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.paper }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: GUTTER, paddingVertical: 6 }}>
        <Pressable onPress={() => router.back()} style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: C.tile, alignItems: 'center', justifyContent: 'center' }}>
          <Body size={18} weight="700">‹</Body>
        </Pressable>
        <View>
          <Serif size={18}>In the bag</Serif>
          <Body size={11} color={C.muted2}>{discs.length} discs · avg speed {avgSpeed}</Body>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: GUTTER, paddingBottom: 40 }}>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          {[[String(discs.length), 'Discs'], [avgSpeed, 'Avg speed'], [String(nCats), 'Categories']].map(([v, l]) => (
            <View key={l} style={[{ flex: 1, backgroundColor: C.card, borderRadius: R.card, borderWidth: 1, borderColor: C.border, padding: 12, alignItems: 'center', gap: 3 }, shadow.card]}>
              <Serif size={20} weight="800">{v}</Serif>
              <Mono size={8} color={C.muted}>{l}</Mono>
            </View>
          ))}
        </View>

        {CATS.map((cat) => {
          const group = discs.filter((d) => d.category === cat);
          if (!group.length) return null;
          return (
            <View key={cat} style={{ marginTop: 18 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Serif size={15}>{cat}</Serif>
                <Mono size={10} color={C.muted}>{group.length}</Mono>
              </View>
              <View style={{ gap: 8 }}>
                {group.map((d) => (
                  <View key={d.id} style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderRadius: R.card, borderWidth: 1, borderColor: C.border, padding: 10 }, shadow.card]}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.tintGreen, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
                      <Serif size={16} weight="800" color={C.forest2}>{String(d.speed)}</Serif>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Body size={14} weight="600" color={C.textStrong}>{d.name}</Body>
                      <Mono size={9} color={C.muted}>{d.brand}</Mono>
                    </View>
                    <FlightBox label="SPD" value={d.speed} />
                    <FlightBox label="GLD" value={d.glide} />
                    <FlightBox label="TRN" value={d.turn} />
                    <FlightBox label="FAD" value={d.fade} />
                    <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); remove(d.id); }} hitSlop={8}
                      style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: C.tile2, alignItems: 'center', justifyContent: 'center' }}>
                      <Body size={13} weight="700" color={C.muted2}>✕</Body>
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          );
        })}

        <Pressable onPress={() => router.push('/catalog')} style={{ marginTop: 18, borderRadius: 14, paddingVertical: 15, alignItems: 'center', borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.clay }}>
          <Body size={15} weight="700" color={C.clay}>+ Add a disc</Body>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
