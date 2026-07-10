import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, FlatList, Modal, PanResponder, Pressable, View, Animated } from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Serif, Body, Mono } from '@/components/Type';
import { CourseCard } from '@/components/CourseCard';
import { ProvenancePill } from '@/components/Provenance';
import { C, GUTTER, shadow } from '@/theme/tokens';
import { loadCourses } from '@/lib/seed';
import { resolveLocation, fixLabel } from '@/lib/location';
import { haversineMi } from '@/lib/prng';
import { Course, LocFix } from '@/lib/types';

const H = Dimensions.get('window').height;
const SNAPS = [H * 0.18, H * 0.45, H * 0.78]; // peek / half / full

const DISTS = [10, 25, 50, 100] as const;
const HOLES = ['Any', '9', '18+'] as const;
const DIFFS = ['Any', 'Beginner', 'Intermediate', 'Advanced'] as const;
const TERRAINS = ['Any', 'Wooded', 'Open', 'Mixed', 'Hilly'] as const;

function PillRow<T extends string | number>({ options, value, onChange }: { options: readonly T[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => (
        <Pressable key={String(o)} onPress={() => onChange(o)} style={{
          paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999,
          backgroundColor: o === value ? C.forest : C.tile2, borderWidth: 1, borderColor: C.border,
        }}>
          <Body size={13} weight="600" color={o === value ? C.paper : C.text}>{typeof o === 'number' ? `${o} mi` : String(o)}</Body>
        </Pressable>
      ))}
    </View>
  );
}

export default function Courses() {
  const router = useRouter();
  const map = useRef<MapView>(null);
  const [fix, setFix] = useState<LocFix | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selC, setSelC] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [dist, setDist] = useState<(typeof DISTS)[number]>(50);
  const [holes, setHoles] = useState<(typeof HOLES)[number]>('Any');
  const [diff, setDiff] = useState<(typeof DIFFS)[number]>('Any');
  const [terrain, setTerrain] = useState<(typeof TERRAINS)[number]>('Any');

  // draggable bottom sheet: snaps to peek / half / full
  const sheetH = useRef(new Animated.Value(SNAPS[1])).current;
  const cur = useRef(SNAPS[1]);
  useEffect(() => { const id = sheetH.addListener(({ value }) => (cur.current = value)); return () => sheetH.removeListener(id); }, []);
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, g) => sheetH.setValue(Math.min(SNAPS[2], Math.max(SNAPS[0], cur.current - g.dy * 0.6))),
    onPanResponderRelease: () => {
      const nearest = SNAPS.reduce((a, b) => (Math.abs(b - cur.current) < Math.abs(a - cur.current) ? b : a));
      Animated.spring(sheetH, { toValue: nearest, useNativeDriver: false, bounciness: 4 }).start();
    },
  })).current;

  useEffect(() => {
    (async () => {
      const f = await resolveLocation();
      setFix(f);
      const all = await loadCourses();
      setCourses(all.map((c) => ({ ...c, distanceMi: haversineMi(f.lat, f.lng, c.lat, c.lng) })));
    })();
  }, []);

  const filtered = useMemo(() => courses
    .filter((c) => c.distanceMi! <= dist)
    .filter((c) => holes === 'Any' || (holes === '9' ? c.holes === 9 : c.holes >= 18))
    .filter((c) => diff === 'Any' || c.difficulty === diff)
    .filter((c) => terrain === 'Any' || c.terrain === terrain)
    .sort((a, b) => a.distanceMi! - b.distanceMi!), [courses, dist, holes, diff, terrain]);

  const filterCount = (holes !== 'Any' ? 1 : 0) + (diff !== 'Any' ? 1 : 0) + (terrain !== 'Any' ? 1 : 0) + (dist !== 50 ? 1 : 0);
  const lbl = fix ? fixLabel(fix) : null;

  const recenter = () => {
    if (!fix || !filtered.length) return;
    map.current?.fitToCoordinates(
      [{ latitude: fix.lat, longitude: fix.lng }, ...filtered.slice(0, 4).map((c) => ({ latitude: c.lat, longitude: c.lng }))],
      { edgePadding: { top: 120, bottom: 380, left: 60, right: 60 }, animated: true }
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.paper }}>
      <MapView
        ref={map}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        initialRegion={{ latitude: fix?.lat ?? 45.52, longitude: fix?.lng ?? -122.68, latitudeDelta: 0.35, longitudeDelta: 0.35 }}
        onMapReady={recenter}
      >
        {fix && (
          <>
            <Marker coordinate={{ latitude: fix.lat, longitude: fix.lng }}>
              <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: C.clay, borderWidth: 3, borderColor: '#fff' }} />
            </Marker>
            <Circle center={{ latitude: fix.lat, longitude: fix.lng }} radius={(fix.accuracyFt ?? 200) / 3.28}
              strokeColor="rgba(194,112,61,0.4)" fillColor="rgba(194,112,61,0.10)" />
          </>
        )}
        {filtered.map((c) => (
          <Marker key={c.id} coordinate={{ latitude: c.lat, longitude: c.lng }}
            title={c.name} description={`${c.city} · ${c.holes} holes · ${c.distanceMi!.toFixed(1)} mi`}
            onPress={() => setSelC(c.id)}>
            <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: C.forest2, borderWidth: 2.5, borderColor: '#fff' }} />
          </Marker>
        ))}
      </MapView>

      {/* location bar pinned top */}
      <SafeAreaView edges={['top']} pointerEvents="box-none">
        <View style={[{ marginHorizontal: GUTTER, marginTop: 6, backgroundColor: C.card, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: C.border }, shadow.float]}>
          <View style={{ flex: 1 }}>
            <Body size={13} weight="600" color={C.textStrong}>Your location</Body>
            {lbl && <ProvenancePill kind={lbl.ok ? 'ok' : 'weak'} label={lbl.text} />}
          </View>
          <Pressable onPress={recenter} style={{ backgroundColor: C.tile2, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: C.border }}>
            <Body size={12} weight="600">Recenter</Body>
          </Pressable>
        </View>
      </SafeAreaView>

      {/* draggable bottom sheet */}
      <Animated.View style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, height: sheetH, backgroundColor: C.paper, borderTopLeftRadius: 24, borderTopRightRadius: 24 }, shadow.sheet]}>
        <View {...pan.panHandlers} style={{ alignItems: 'center', paddingVertical: 10 }}>
          <View style={{ width: 42, height: 5, borderRadius: 3, backgroundColor: C.tile }} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: GUTTER, marginBottom: 8 }}>
          <View style={{ flex: 1 }}>
            <Serif size={19}>Courses nearby</Serif>
            <Body size={12} color={C.muted2}>{filtered.length} within reach · sorted by distance</Body>
          </View>
          <Pressable onPress={() => setFiltersOpen(true)} style={{ flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: C.tile2, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: C.border }}>
            <Body size={13} weight="600">Filters</Body>
            {filterCount > 0 && (
              <View style={{ backgroundColor: C.clay, borderRadius: 999, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center' }}>
                <Body size={11} weight="700" color={C.paper}>{String(filterCount)}</Body>
              </View>
            )}
          </Pressable>
        </View>
        <FlatList
          data={filtered}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ paddingHorizontal: GUTTER, paddingBottom: 100, gap: 10 }}
          renderItem={({ item }) => (
            <CourseCard course={item} selected={item.id === selC} onPress={() => router.push(`/course/${item.id}`)} />
          )}
        />
      </Animated.View>

      {/* filters modal sheet */}
      <Modal visible={filtersOpen} transparent animationType="slide" onRequestClose={() => setFiltersOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(20,15,8,0.4)' }} onPress={() => setFiltersOpen(false)} />
        <View style={{ backgroundColor: C.paper, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: GUTTER, paddingBottom: 40, gap: 18 }}>
          <Serif size={20}>Filters</Serif>
          <View style={{ gap: 8 }}><Mono size={10}>Distance</Mono><PillRow options={DISTS} value={dist} onChange={setDist} /></View>
          <View style={{ gap: 8 }}><Mono size={10}>Holes</Mono><PillRow options={HOLES} value={holes} onChange={setHoles} /></View>
          <View style={{ gap: 8 }}><Mono size={10}>Difficulty</Mono><PillRow options={DIFFS} value={diff} onChange={setDiff} /></View>
          <View style={{ gap: 8 }}><Mono size={10}>Terrain</Mono><PillRow options={TERRAINS} value={terrain} onChange={setTerrain} /></View>
          <Pressable onPress={() => setFiltersOpen(false)} style={{ backgroundColor: C.clay, borderRadius: 14, paddingVertical: 15, alignItems: 'center' }}>
            <Body size={15} weight="700" color={C.paper}>Show {filtered.length} courses</Body>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}
