import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import { Serif, Body, Mono } from '@/components/Type';
import { Avatar } from '@/components/Avatar';
import { Stepper } from '@/components/Stepper';
import { ScoreChip } from '@/components/ScoreChip';
import { ProvenancePill } from '@/components/Provenance';
import { useToast } from '@/components/Toast';
import { C, GUTTER, shadow } from '@/theme/tokens';
import { useRound, playerTotals } from '@/state/round';
import { loadCourses, holesFor } from '@/lib/seed';
import { subscribeToRound, supabaseEnabled } from '@/lib/supabase';
import { watchToBasket } from '@/lib/location';
import { Player } from '@/lib/types';

const AVATAR_BG = [C.clay, C.forest2, C.moss, C.gold];

export default function Play() {
  useKeepAwake(); // screen stays awake during a live round
  const router = useRouter();
  const toast = useToast();
  const { live, startRound, setScore, applyRemoteScore, setHole, setThrowing, finishRound } = useRound();
  const [gpsFt, setGpsFt] = useState<number | null>(null);
  const flash = useRef<Record<string, Animated.Value>>({}).current;

  // No live round yet: start one at the nearest course with a default group.
  useEffect(() => {
    if (live) return;
    (async () => {
      const courses = await loadCourses();
      const course = courses[0];
      const players: Player[] = [
        { id: 'you', name: 'Evan', initials: 'EW' },
        { id: 'g1', name: 'Maya', initials: 'MK', guest: true },
        { id: 'g2', name: 'Sam', initials: 'SR', guest: true },
        { id: 'g3', name: 'Cole', initials: 'CB', guest: true },
      ];
      startRound(course, 'Blue', holesFor(course), players);
    })();
  }, [live]);

  // Realtime shared scorecard: real Supabase channel when configured,
  // otherwise the prototype's simulation (rotating "throwing" + teammate scores).
  useEffect(() => {
    if (!live) return;
    if (supabaseEnabled) {
      return subscribeToRound(live.id, (row) => {
        const pid = row.player_id ?? live.players.find((p) => p.name === row.guest_name)?.id;
        if (pid && pid !== 'you') {
          applyRemoteScore(pid, row.hole, row.strokes);
          pulse(pid);
          toast(`${live.players.find((p) => p.id === pid)?.name} scored hole ${row.hole}`);
        }
      });
    }
    const t = setInterval(() => {
      const others = live.players.filter((p) => p.id !== 'you');
      const p = others[Math.floor(Math.random() * others.length)];
      setThrowing(p.id);
      if (Math.random() > 0.5) {
        const par = live.pars[live.cur - 1];
        const s = par + [-1, 0, 0, 1][Math.floor(Math.random() * 4)];
        applyRemoteScore(p.id, live.cur, s);
        pulse(p.id);
        toast(`${p.name} carded a ${s} on hole ${live.cur}`);
      }
    }, 7000);
    return () => clearInterval(t);
  }, [live?.id, live?.cur]);

  // Live GPS-to-basket readout for the current hole (target = course pin as placeholder for the OSM basket pin)
  useEffect(() => {
    if (!live) return;
    let stop = () => {};
    loadCourses().then((cs) => {
      const c = cs.find((x) => x.id === live.courseId);
      if (c) stop = watchToBasket({ lat: c.lat, lng: c.lng }, setGpsFt);
    });
    return () => stop();
  }, [live?.courseId, live?.cur]);

  const pulse = (pid: string) => {
    if (!flash[pid]) flash[pid] = new Animated.Value(0);
    Animated.sequence([
      Animated.timing(flash[pid], { toValue: 1, duration: 150, useNativeDriver: false }),
      Animated.timing(flash[pid], { toValue: 0, duration: 900, useNativeDriver: false }),
    ]).start();
  };

  // Swipe left/right on the hole card changes hole
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 24 && Math.abs(g.dy) < 30,
    onPanResponderRelease: (_, g) => {
      if (!live) return;
      if (g.dx < -40) setHole(live.cur + 1);
      if (g.dx > 40) setHole(live.cur - 1);
      Haptics.selectionAsync();
    },
  }), [live?.cur]);

  if (!live) return <View style={{ flex: 1, backgroundColor: C.paper }} />;

  const n = live.pars.length;
  const par = live.pars[live.cur - 1];
  const holeInfo = { distFt: 300 + par * 40, source: (live.cur % 3 !== 0 ? 'osm' : 'estimated') as 'osm' | 'estimated' };
  const last = live.cur === n;

  const finish = () => {
    finishRound();
    router.push('/summary');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.paper }} edges={['top']}>
      {/* app bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: GUTTER, paddingVertical: 6 }}>
        <Pressable onPress={() => router.push('/')} style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: C.tile, alignItems: 'center', justifyContent: 'center' }}>
          <Body size={18} weight="700">‹</Body>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Serif size={17}>{live.courseName}</Serif>
          <Body size={11} color={C.muted2}>{live.layout} · Par {live.pars.reduce((a, b) => a + b, 0)}</Body>
        </View>
        {/* live group pill */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: C.tintGreen, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.birdieFg }} />
          <View style={{ flexDirection: 'row' }}>
            {live.players.map((p, i) => (
              <View key={p.id} style={{ marginLeft: i ? -8 : 0 }}>
                <Avatar initials={p.initials} size={22} bg={AVATAR_BG[i % 4]} ring={live.throwing === p.id} />
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* 18-segment progress: past moss / current clay / upcoming tan */}
      <View style={{ flexDirection: 'row', gap: 3, paddingHorizontal: GUTTER, marginVertical: 6 }}>
        {live.pars.map((_, i) => (
          <View key={i} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: i + 1 < live.cur ? C.moss : i + 1 === live.cur ? C.clay : C.tile }} />
        ))}
      </View>

      {/* hole card */}
      <View {...pan.panHandlers} style={[{ marginHorizontal: GUTTER, backgroundColor: C.forest, borderRadius: 24, padding: 18 }, shadow.card]}>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ flex: 1 }}>
            <Mono size={10} color={C.moss}>Hole</Mono>
            <Serif size={74} weight="800" color={C.paper} style={{ lineHeight: 78 }}>{String(live.cur)}</Serif>
            <Body size={15} weight="700" color={C.paper}>Par {par}</Body>
            <Body size={12} color="#cfc9b8">{holeInfo.distFt} ft · {live.layout} tee → basket</Body>
          </View>
          <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
            <Serif size={40} weight="800" color={C.paper}>{gpsFt != null ? String(gpsFt) : '—'}</Serif>
            <Body size={13} color="#cfc9b8">ft</Body>
            <Mono size={9} color={C.moss}>GPS to basket</Mono>
          </View>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
          <ProvenancePill kind={holeInfo.source === 'osm' ? 'real' : 'est'} label={holeInfo.source === 'osm' ? 'OSM layout' : 'Estimated distance'} />
          <Mono size={9} color="#cfc9b8">‹ swipe holes ›</Mono>
        </View>
      </View>

      {/* player rows */}
      <ScrollView style={{ flex: 1, marginTop: 10 }} contentContainerStyle={{ paddingHorizontal: GUTTER, gap: 8, paddingBottom: 8 }}>
        {live.players.map((p, i) => {
          const t = playerTotals(live.scores[p.id], live.pars);
          const s = live.scores[p.id][live.cur] ?? par;
          if (!flash[p.id]) flash[p.id] = new Animated.Value(0);
          const bg = flash[p.id].interpolate({ inputRange: [0, 1], outputRange: [C.card, C.tintGreen] });
          return (
            <Animated.View key={p.id} style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: bg, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 10 }, shadow.card]}>
              <Avatar initials={p.initials} size={36} bg={AVATAR_BG[i % 4]} ring={live.throwing === p.id} />
              <View style={{ flex: 1 }}>
                <Body size={14} weight="600" color={C.textStrong}>{p.name}{p.id === 'you' ? ' (you)' : ''}</Body>
                <Mono size={10} color={C.muted}>Thru {t.thru} · {t.rel === 0 ? 'E' : t.rel > 0 ? `+${t.rel}` : t.rel}</Mono>
              </View>
              {live.scores[p.id][live.cur] != null && <ScoreChip strokes={live.scores[p.id][live.cur]} par={par} />}
              {p.id === 'you'
                ? <Stepper value={s} onChange={(v) => setScore('you', live.cur, v)} />
                : <Serif size={22}>{live.scores[p.id][live.cur] != null ? String(live.scores[p.id][live.cur]) : '·'}</Serif>}
            </Animated.View>
          );
        })}
        <Mono size={9} color={C.muted} style={{ textAlign: 'center', marginTop: 4 }}>
          Offline · saved locally · screen stays awake · haptics on
        </Mono>
      </ScrollView>

      {/* footer nav */}
      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: GUTTER, paddingBottom: 8 }}>
        <Pressable onPress={() => setHole(live.cur - 1)} style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: C.tile2, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
          <Body size={20} weight="700">‹</Body>
        </Pressable>
        <Pressable onPress={() => (last ? finish() : setHole(live.cur + 1))} style={{ flex: 1, height: 52, borderRadius: 14, backgroundColor: C.clay, alignItems: 'center', justifyContent: 'center' }}>
          <Body size={16} weight="700" color={C.paper}>{last ? 'Finish round →' : 'Next hole →'}</Body>
        </Pressable>
        <Pressable onPress={() => setHole(live.cur + 1)} style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: C.tile2, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
          <Body size={20} weight="700">›</Body>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
