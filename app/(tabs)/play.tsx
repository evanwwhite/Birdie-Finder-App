import React, { useEffect, useState } from 'react';
import { AppState, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Serif, Body, Mono } from '@/components/Type';
import { C, GUTTER, R } from '@/theme/tokens';
import { useRound, type PlayableCourse } from '@/state/round';
import { internalCourses, loadSoloCourses } from '@/lib/soloCatalog';
import { supabase } from '@/lib/supabase';

export default function Play() {
  const router = useRouter();
  const live = useRound(s => s.live);
  const hydrated = useRound(s => s.hydrated);
  const [courses, setCourses] = useState<PlayableCourse[]>(internalCourses);
  const [signedIn, setSignedIn] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    void loadSoloCourses().then(setCourses).catch(() => {});
    void supabase?.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const auth = supabase?.auth.onAuthStateChange((_event, session) => setSignedIn(!!session));
    const app = AppState.addEventListener('change', state => {
      if (state === 'active') {
        void useRound.getState().refreshAll();
      }
    });
    return () => { auth?.data.subscription.unsubscribe(); app.remove(); };
  }, []);

  const start = (course: PlayableCourse) => {
    if (!hydrated) { setError('Opening saved rounds. Try again in a moment.'); return; }
    try { useRound.getState().startRound(course); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not start round'); }
  };
  if (!hydrated) return <SafeAreaView style={{ flex: 1, backgroundColor: C.paper, padding: GUTTER }}><Body>Opening saved rounds…</Body></SafeAreaView>;
  if (!live) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.paper }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: GUTTER, gap: 14 }}>
        <Mono size={11}>{__DEV__ ? 'Internal solo scorecard' : 'Solo scorecard'}</Mono>
        <Serif size={28} weight="800">Start a round</Serif>
        <Body size={13} color={C.muted2}>{__DEV__ ? 'Synthetic test courses are available in development. ' : ''}Scores save on this phone first and sync when you sign in and reconnect.</Body>
        {!courses.length && <Body size={13} color={C.muted2}>No approved playable courses are available yet. Connect to refresh the catalog.</Body>}
        {!signedIn && <Pressable onPress={() => router.push('/login')} style={{ padding: 14, backgroundColor: C.clay, borderRadius: R.card }}>
          <Body size={15} weight="700" color={C.paper}>Sign in to sync across devices</Body>
        </Pressable>}
        {courses.map(course => <Pressable key={course.id} onPress={() => start(course)}
          style={{ padding: 18, backgroundColor: C.card, borderRadius: R.card, borderWidth: 1, borderColor: C.border, gap: 5 }}>
          <Serif size={20}>{course.name}</Serif>
          <Body size={12} color={C.muted2}>{course.layout} · {course.holes.length} holes · {course.holes.some(h => h.par === null) ? 'some par unknown' : 'par known'}</Body>
          <Body size={13} color={C.clay}>Start →</Body>
        </Pressable>)}
        {!!error && <Body color={C.clay}>{error}</Body>}
      </ScrollView>
    </SafeAreaView>
  );

  const hole = live.holes[live.cur - 1];
  const strokes = live.scores[live.participantId][hole.hole];
  const played = live.holes.filter(h => live.scores[live.participantId][h.hole] != null).length;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.paper }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: GUTTER, gap: 16 }}>
        <Mono size={11}>Solo round · {played}/{live.holes.length} holes scored</Mono>
        <Serif size={26} weight="800">{live.courseName}</Serif>
        <Body size={13} color={C.muted2}>{live.layout}</Body>
        <View style={{ backgroundColor: C.card, padding: 20, borderRadius: R.card, gap: 12 }}>
          <Serif size={32} weight="800">Hole {hole.hole}</Serif>
          <Body size={15}>Par {hole.par ?? 'unknown'} · {hole.distFt == null ? 'distance unknown' : `${hole.distFt} ft`}</Body>
          <Body size={20} weight="700">{strokes == null ? 'No score yet' : `${strokes} strokes`}</Body>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable onPress={() => useRound.getState().setScore(hole.hole, strokes == null ? 1 : Math.max(1, strokes - 1))}
              style={{ flex: 1, padding: 16, alignItems: 'center', backgroundColor: C.tile, borderRadius: 10 }}><Body size={18}>−</Body></Pressable>
            <Pressable onPress={() => useRound.getState().setScore(hole.hole, strokes == null ? 1 : Math.min(12, strokes + 1))}
              style={{ flex: 1, padding: 16, alignItems: 'center', backgroundColor: C.tile, borderRadius: 10 }}><Body size={18}>+</Body></Pressable>
          </View>
          {strokes == null && <Body size={12} color={C.muted2}>Tap + to record your first stroke.</Body>}
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable disabled={live.cur === 1} onPress={() => useRound.getState().setHole(live.cur - 1)}
            style={{ flex: 1, padding: 14, backgroundColor: C.tile, borderRadius: 10, opacity: live.cur === 1 ? 0.4 : 1 }}><Body>← Previous</Body></Pressable>
          <Pressable disabled={live.cur === live.holes.length} onPress={() => useRound.getState().setHole(live.cur + 1)}
            style={{ flex: 1, padding: 14, backgroundColor: C.tile, borderRadius: 10, opacity: live.cur === live.holes.length ? 0.4 : 1 }}><Body>Next →</Body></Pressable>
        </View>
        <Body size={12} color={live.syncError ? C.clay : C.muted2}>
          {live.syncError ? `Sync needs attention: ${live.syncError}` : signedIn ? 'Saved on phone; pending changes sync when connected.' : 'Saved on phone only. Sign in to sync new rounds.'}
        </Body>
        <Pressable disabled={played !== live.holes.length} onPress={() => {
          if (useRound.getState().finishRound()) router.push('/summary');
        }} style={{ padding: 16, borderRadius: 12, backgroundColor: C.clay, opacity: played === live.holes.length ? 1 : 0.4, alignItems: 'center' }}>
          <Body color={C.paper} weight="700">Finish round</Body>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
