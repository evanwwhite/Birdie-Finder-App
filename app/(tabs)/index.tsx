import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Serif, Body, Mono } from '@/components/Type';
import { Avatar } from '@/components/Avatar';
import { SectionHeader } from '@/components/Section';
import { CourseCard, Thumb } from '@/components/CourseCard';
import { C, GUTTER, R, shadow } from '@/theme/tokens';
import { loadCourses } from '@/lib/seed';
import { resolveLocation } from '@/lib/location';
import { fetchWeather, Weather } from '@/lib/weather';
import { haversineMi } from '@/lib/prng';
import { Course } from '@/lib/types';
import { useRound, playerTotals } from '@/state/round';

function QuickAction({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[{ flex: 1, backgroundColor: C.card, borderRadius: R.card, borderWidth: 1, borderColor: C.border, padding: 14, alignItems: 'center', gap: 8 }, shadow.card]}>
      <View style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 3, borderColor: C.clay }} />
      <Body size={12} weight="600">{label}</Body>
    </Pressable>
  );
}

export default function Home() {
  const router = useRouter();
  const [near, setNear] = useState<Course[]>([]);
  const [wx, setWx] = useState<Weather | null>(null);
  const live = useRound((s) => s.live);
  const history = useRound((s) => s.history);

  useEffect(() => {
    (async () => {
      const fix = await resolveLocation();
      const courses = await loadCourses();
      const sorted = courses
        .map((c) => ({ ...c, distanceMi: haversineMi(fix.lat, fix.lng, c.lat, c.lng) }))
        .sort((a, b) => a.distanceMi! - b.distanceMi!);
      setNear(sorted.slice(0, 2));
      setWx(await fetchWeather(fix.lat, fix.lng));
    })();
  }, []);

  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const you = live?.players[0];
  const t = live && you ? playerTotals(live.scores[you.id], live.pars) : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.paper }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: GUTTER, paddingVertical: 8 }}>
        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.forest, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 12, height: 12, borderRadius: 6, borderWidth: 2.5, borderColor: C.paper }} />
        </View>
        <Serif size={19} style={{ flex: 1 }}>Birdie Finder</Serif>
        <Pressable onPress={() => router.push('/stats')}><Avatar initials="EW" /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: GUTTER, paddingBottom: 32 }}>
        <Serif size={25} weight="800" style={{ marginTop: 8 }}>{greet}, Evan.</Serif>
        <Mono size={11} color={C.gold} style={{ marginTop: 5 }}>
          {wx ? `${wx.tempF}° · ${wx.sky} · wind ${wx.windMph} mph — good disc weather` : 'Conditions unavailable offline'}
        </Mono>

        {live && t && (
          <View style={[{ backgroundColor: C.forest, borderRadius: R.cardLg, padding: 17, marginTop: 16, gap: 6 }, shadow.card]}>
            <Mono size={10} color={C.moss}>Round in progress</Mono>
            <Serif size={21} color={C.paper}>{live.courseName} · {live.layout}</Serif>
            <Body size={12} color="#cfc9b8">
              Thru {t.thru} · You {t.rel === 0 ? 'E' : t.rel > 0 ? `+${t.rel}` : t.rel} · {live.players.length} playing · saved offline
            </Body>
            <Pressable onPress={() => router.push('/play')} style={{ backgroundColor: C.clay, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 8 }}>
              <Body size={15} weight="700" color={C.paper}>Resume ▸</Body>
            </Pressable>
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
          <QuickAction label="Find courses" onPress={() => router.push('/courses')} />
          <QuickAction label="New round" onPress={() => router.push('/play')} />
          <QuickAction label="My stats" onPress={() => router.push('/stats')} />
        </View>

        <SectionHeader title="Courses near you" action="View all →" onAction={() => router.push('/courses')} />
        <View style={{ gap: 10 }}>
          {near.map((c) => <CourseCard key={c.id} course={c} onPress={() => router.push(`/course/${c.id}`)} />)}
        </View>

        <SectionHeader title="Recent rounds" action="All rounds →" onAction={() => router.push('/stats')} />
        <View style={{ gap: 10 }}>
          {history.length === 0 && <Body size={13} color={C.muted2}>No rounds yet — start one from a course page.</Body>}
          {history.slice(0, 2).map((r) => (
            <View key={r.id} style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: R.card, borderWidth: 1, borderColor: C.border, padding: 12 }, shadow.card]}>
              <Thumb letter={r.courseName[0]} size={42} />
              <View style={{ flex: 1 }}>
                <Body size={14} weight="600" color={C.textStrong}>{r.courseName}</Body>
                <Body size={12} color={C.muted2}>{new Date(r.playedAt).toLocaleDateString()} · {r.holes} holes</Body>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Serif size={19}>{String(r.total)}</Serif>
                <Body size={12} weight="700" color={r.relPar <= 0 ? C.birdieFg : C.clay}>
                  {r.relPar === 0 ? 'E' : r.relPar > 0 ? `+${r.relPar}` : r.relPar}
                </Body>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
