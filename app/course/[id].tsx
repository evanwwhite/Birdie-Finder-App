import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Serif, Body, Mono } from '@/components/Type';
import { ProvenancePill } from '@/components/Provenance';
import { Avatar } from '@/components/Avatar';
import { C, GUTTER, R, shadow } from '@/theme/tokens';
import { loadCourses, holesFor, enrichHoleElevations } from '@/lib/seed';
import { fetchWeather, Weather } from '@/lib/weather';
import { seeded } from '@/lib/prng';
import { Course, Hole } from '@/lib/types';
import { useRound } from '@/state/round';

const AMENITIES = ['Restrooms', 'Water', 'Practice basket', 'Parking', 'Pro shop'];
const REVIEWERS = [['Maya K', 'MK', 'Played 30+ rounds here'], ['Sam R', 'SR', 'Local'], ['Jordan T', 'JT', 'Visiting from Bend']];

function Card({ title, children, right }: any) {
  return (
    <View style={[{ backgroundColor: C.card, borderRadius: R.card, borderWidth: 1, borderColor: C.border, padding: 14, marginTop: 12 }, shadow.card]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Serif size={16}>{title}</Serif>{right}
      </View>
      {children}
    </View>
  );
}

export default function CourseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const startRound = useRound((s) => s.startRound);
  const [course, setCourse] = useState<Course | null>(null);
  const [wx, setWx] = useState<Weather | null>(null);
  const [holes, setHoles] = useState<Hole[]>([]);

  useEffect(() => {
    let alive = true;
    loadCourses().then(async (cs) => {
      const c = cs.find((x) => x.id === id) ?? cs[0];
      if (!alive) return;
      setCourse(c);
      const base = holesFor(c);
      setHoles(base);
      // real terrain elevation (Open-Meteo over OSM tee/basket coords), async on top
      enrichHoleElevations(c, base).then((h) => alive && setHoles(h));
      setWx(await fetchWeather(c.lat, c.lng));
    });
    return () => { alive = false; };
  }, [id]);
  const reviews = useMemo(() => {
    if (!course) return [];
    const rnd = seeded(course.id + 'rev');
    return REVIEWERS.map(([name, ini, meta]) => ({
      name, ini, meta, stars: 4 + Math.round(rnd()),
      body: ['Great flow between holes and honest signage.', 'Wooded back nine is the highlight — bring a stable mid.', 'Well kept tee pads; gets busy on weekends.'][Math.floor(rnd() * 3)],
    }));
  }, [course]);

  if (!course) return <View style={{ flex: 1, backgroundColor: C.paper }} />;
  const dist = holes.reduce((a, h) => a + h.distFt, 0);
  const goodConditions = wx ? wx.rain24In < 0.2 && wx.windMph < 15 : null;
  const cats = [['Scenery', 0.9], ['Upkeep', 0.82], ['Signage', 0.74], ['Difficulty', 0.66]] as const;

  const start = () => {
    startRound(course, 'Blue', holes, [
      { id: 'you', name: 'Evan', initials: 'EW' },
      { id: 'g1', name: 'Maya', initials: 'MK', guest: true },
      { id: 'g2', name: 'Sam', initials: 'SR', guest: true },
      { id: 'g3', name: 'Cole', initials: 'CB', guest: true },
    ]);
    router.push('/play');
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.paper }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 130 }}>
        {/* hero */}
        <View style={{ height: 240, backgroundColor: C.forest2, justifyContent: 'flex-end' }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={{ position: 'absolute', top: i * 55, left: -120, width: 700, height: 26, backgroundColor: C.forest, opacity: 0.35, transform: [{ rotate: '-10deg' }] }} />
          ))}
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(20,25,15,0.35)' }} />
          <SafeAreaView edges={['top']} style={{ position: 'absolute', top: 0, left: 0 }}>
            <Pressable onPress={() => router.back()} style={{ margin: GUTTER, width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(245,240,230,0.9)', alignItems: 'center', justifyContent: 'center' }}>
              <Body size={18} weight="700">‹</Body>
            </Pressable>
          </SafeAreaView>
          <View style={{ padding: GUTTER, gap: 4 }}>
            <Serif size={28} weight="800" color={C.paper}>{course.name}</Serif>
            <Body size={13} color="#e8e2d2">{course.city}, {course.state}{course.distanceMi != null ? ` · ${course.distanceMi.toFixed(1)} mi away` : ''}</Body>
            {course.rating != null
              ? <Body size={13} weight="700" color={C.paper}>★ {course.rating.toFixed(1)} <Body size={12} color="#cfc9b8">/ 128 reviews</Body></Body>
              : <Body size={12} color="#cfc9b8">No ratings yet</Body>}
          </View>
        </View>

        <View style={{ paddingHorizontal: GUTTER }}>
          {/* stat bar */}
          <View style={[{ flexDirection: 'row', backgroundColor: C.card, borderRadius: R.card, borderWidth: 1, borderColor: C.border, marginTop: -18, paddingVertical: 12 }, shadow.card]}>
            {[[String(course.holes), 'Holes'], [`${course.par}${course.parEstimated ? '*' : ''}`, 'Par'], [dist.toLocaleString(), 'Feet'], [course.difficulty ?? '—', 'Difficulty']].map(([v, l]) => (
              <View key={l} style={{ flex: 1, alignItems: 'center', gap: 2 }}>
                <Serif size={17} weight="800">{v}</Serif>
                <Mono size={8} color={C.muted}>{l}</Mono>
              </View>
            ))}
          </View>

          {/* conditions — live from Open-Meteo, graceful fallback */}
          <View style={[{ backgroundColor: C.card, borderRadius: R.card, borderWidth: 1, borderColor: C.border, padding: 14, marginTop: 12, gap: 8 }, shadow.card]}>
            {wx ? (
              <>
                <ProvenancePill kind={goodConditions ? 'real' : 'est'} label={goodConditions ? 'Good conditions today' : 'Check conditions'} />
                <Body size={13} color={C.muted2}>{wx.tempF}° · {wx.sky} · wind {wx.windMph} mph · rain 24h {wx.rain24In}"</Body>
              </>
            ) : <Body size={13} color={C.muted2}>Conditions unavailable offline</Body>}
          </View>

          <Card title="About">
            <Body size={13} style={{ lineHeight: 19 }}>
              {course.name} is a {course.holes}-hole, par-{course.par}{course.terrain ? ` ${course.terrain.toLowerCase()}` : ''} course in {course.city}{course.difficulty ? ` — ${course.difficulty.toLowerCase()}-friendly` : ''} with honest signage and multiple tee options.
            </Body>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              {AMENITIES.map((a) => (
                <View key={a} style={{ backgroundColor: C.tintGreen, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Body size={11} weight="600" color={C.forest2}>{a}</Body>
                </View>
              ))}
            </View>
          </Card>

          <Card title="Hole by hole" right={<ProvenancePill kind="est" label="OSM + estimated" />}>
            <View style={{ flexDirection: 'row', paddingBottom: 6 }}>
              {['Hole', 'Par', 'Dist', 'Elev', 'Difficulty'].map((h, i) => (
                <Mono key={h} size={9} color={C.muted} style={{ flex: i === 4 ? 1.4 : i === 0 ? 0.7 : 1 }}>{h}</Mono>
              ))}
            </View>
            {holes.map((h) => (
              <View key={h.hole} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 7, backgroundColor: h.hole % 2 ? 'transparent' : C.tile3 }}>
                <Body size={12} weight="600" style={{ flex: 0.7 }}>{String(h.hole)}</Body>
                <Body size={12} weight={h.source === 'osm' ? '700' : '400'} color={h.source === 'osm' ? C.birdieFg : C.text} style={{ flex: 1 }}>
                  {h.par}{h.source === 'osm' ? ' ●' : ''}
                </Body>
                <Body size={12} style={{ flex: 1 }}>{h.distFt} ft</Body>
                <Body size={12} weight={h.elevSource === 'osm' ? '700' : '400'} color={h.elevSource === 'osm' ? C.birdieFg : C.text} style={{ flex: 1 }}>{h.elevFt >= 0 ? `+${h.elevFt}` : h.elevFt} ft{h.elevSource === 'osm' ? ' ●' : ''}</Body>
                <View style={{ flex: 1.4, height: 6, borderRadius: 3, backgroundColor: C.tile, overflow: 'hidden' }}>
                  <View style={{ width: `${Math.min(100, (h.distFt / 640) * 100)}%`, height: 6, backgroundColor: C.moss }} />
                </View>
              </View>
            ))}
            <Mono size={8} color={C.muted} style={{ marginTop: 8 }} caps={false}>Surveyed holes (●) © OpenStreetMap contributors; others estimated.</Mono>
          </Card>

          <Card title="Reviews">
            <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
              <Serif size={40} weight="800">{course.rating != null ? course.rating.toFixed(1) : '—'}</Serif>
              <View style={{ flex: 1, gap: 5 }}>
                {cats.map(([l, v]) => (
                  <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Mono size={8} color={C.muted} style={{ width: 62 }}>{l}</Mono>
                    <View style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: C.tile }}>
                      <View style={{ width: `${v * 100}%`, height: 5, borderRadius: 3, backgroundColor: C.moss }} />
                    </View>
                  </View>
                ))}
              </View>
            </View>
            <View style={{ gap: 12, marginTop: 14 }}>
              {reviews.map((r) => (
                <View key={r.name} style={{ flexDirection: 'row', gap: 10 }}>
                  <Avatar initials={r.ini} size={32} bg={C.forest2} />
                  <View style={{ flex: 1 }}>
                    <Body size={13} weight="600" color={C.textStrong}>{r.name} <Body size={11} color={C.clay}>{'★'.repeat(r.stars)}</Body></Body>
                    <Body size={11} color={C.muted2}>{r.meta}</Body>
                    <Body size={12} style={{ marginTop: 3, lineHeight: 17 }}>{r.body}</Body>
                  </View>
                </View>
              ))}
            </View>
          </Card>

          <Card title="Details">
            {[['Type', 'Public'], ['Tees', 'Blue / White'], ['Baskets', 'DISCatcher Pro'], ['Hours', 'Dawn – dusk'], ['Est. round', '~2h 10m']].map(([k, v]) => (
              <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 }}>
                <Body size={12} color={C.muted2}>{k}</Body>
                <Body size={12} weight="600" color={C.textStrong}>{v}</Body>
              </View>
            ))}
            <Mono size={8} color={C.muted} style={{ marginTop: 6 }} caps={false}>Weather by Open-Meteo.</Mono>
          </Card>
        </View>
      </ScrollView>

      {/* sticky actions */}
      <View style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: C.paper, padding: GUTTER, paddingBottom: 32, flexDirection: 'row', gap: 10, borderTopWidth: 1, borderColor: C.border }, shadow.sheet]}>
        <Pressable onPress={start} style={{ flex: 1.4, backgroundColor: C.clay, borderRadius: 14, paddingVertical: 15, alignItems: 'center' }}>
          <Body size={15} weight="700" color={C.paper}>Start a scorecard ▸</Body>
        </Pressable>
        <Pressable onPress={() => Linking.openURL(`https://maps.apple.com/?daddr=${course.lat},${course.lng}`)}
          style={{ flex: 1, borderRadius: 14, paddingVertical: 15, alignItems: 'center', borderWidth: 1.5, borderColor: C.forest }}>
          <Body size={15} weight="700" color={C.forest}>Directions</Body>
        </Pressable>
      </View>
    </View>
  );
}
