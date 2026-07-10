import React, { useEffect } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Serif, Body, Mono } from '@/components/Type';
import { Avatar } from '@/components/Avatar';
import { Thumb } from '@/components/CourseCard';
import { C, GUTTER, R, shadow } from '@/theme/tokens';
import { useRound } from '@/state/round';
import { useBag } from '@/state/bag';
import { loadDiscs } from '@/lib/seed';

const RATINGS = [871, 866, 878, 882, 875, 889, 884, 893]; // last 8 rounds (placeholder until server rounds feed it)
const SEASON = [
  { label: 'Circle 1 putting', value: '61%', delta: '▲ 4% vs 2025' },
  { label: 'Circle 2 putting', value: '28%', delta: '▲ 2% vs 2025' },
  { label: 'Fairway hits', value: '72%', delta: '▲ 5% vs 2025' },
  { label: 'Parked / GIR', value: '48%', delta: '▲ 3% vs 2025' },
];
const FRIENDS = [
  { rank: 1, name: 'Maya K', initials: 'MK', meta: '14 rounds · Pier Park', rating: 902 },
  { rank: 2, name: 'Evan White', initials: 'EW', meta: '12 rounds · Pier Park', rating: 893, you: true },
  { rank: 3, name: 'Sam R', initials: 'SR', meta: '9 rounds · Lunchtime', rating: 861 },
  { rank: 4, name: 'Cole B', initials: 'CB', meta: '7 rounds · Blue Lake', rating: 848 },
];

function Panel({ title, action, onAction, children }: any) {
  return (
    <View style={[{ backgroundColor: C.card, borderRadius: R.card, borderWidth: 1, borderColor: C.border, padding: 14, marginTop: 12 }, shadow.card]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
        <Serif size={16}>{title}</Serif>
        {action && <Pressable onPress={onAction}><Body size={13} weight="600" color={C.clay}>{action}</Body></Pressable>}
      </View>
      {children}
    </View>
  );
}

export default function Stats() {
  const router = useRouter();
  const history = useRound((s) => s.history);
  const bag = useBag();

  useEffect(() => { loadDiscs().then((d) => bag.seedIfEmpty(d.slice(0, 8))); }, []);

  const max = Math.max(...RATINGS);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.paper }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {/* profile hero */}
        <View style={{ backgroundColor: C.forest, padding: 20, paddingTop: 24, alignItems: 'center', gap: 8 }}>
          <Avatar initials="EW" size={68} />
          <Serif size={24} weight="800" color={C.paper}>Evan White</Serif>
          <Mono size={10} color={C.moss} caps={false}>@evanwhite · PDGA #182044</Mono>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
            {[`893 rating`, `${129 + history.length} rounds`, `42 courses`].map((b) => (
              <View key={b} style={{ backgroundColor: 'rgba(245,240,230,0.12)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
                <Body size={11} weight="600" color={C.paper}>{b}</Body>
              </View>
            ))}
          </View>
        </View>

        <View style={{ paddingHorizontal: GUTTER }}>
          {/* stat strip */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }} contentContainerStyle={{ gap: 8 }}>
            {[['Rounds', String(129 + history.length)], ['Avg', '54.2'], ['Best', '−7'], ['Aces', '3'], ['Courses', '42']].map(([l, v]) => (
              <View key={l} style={[{ backgroundColor: C.card, borderRadius: R.card, borderWidth: 1, borderColor: C.border, paddingHorizontal: 18, paddingVertical: 10, alignItems: 'center' }, shadow.card]}>
                <Serif size={19} weight="800">{v}</Serif>
                <Mono size={9} color={C.muted}>{l}</Mono>
              </View>
            ))}
          </ScrollView>

          <Panel title="Player rating">
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 90 }}>
              {RATINGS.map((r, i) => (
                <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                  <View style={{ width: '100%', height: (r - 840) / (max - 840) * 78 + 10, borderRadius: 6, backgroundColor: i === RATINGS.length - 1 ? C.clay : C.moss, opacity: i === RATINGS.length - 1 ? 1 : 0.75 }} />
                </View>
              ))}
            </View>
            <Mono size={9} color={C.muted} style={{ marginTop: 8 }}>Last 8 rounds · latest {RATINGS.at(-1)}</Mono>
          </Panel>

          <Panel title="This season">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {SEASON.map((s) => (
                <View key={s.label} style={{ width: '48%', backgroundColor: C.tile3, borderRadius: 12, padding: 12, gap: 3 }}>
                  <Serif size={20} weight="800">{s.value}</Serif>
                  <Body size={11} color={C.muted2}>{s.label}</Body>
                  <Body size={10} weight="600" color={C.birdieFg}>{s.delta}</Body>
                </View>
              ))}
            </View>
          </Panel>

          <Panel title="Recent rounds">
            <View style={{ gap: 10 }}>
              {history.length === 0 && <Body size={13} color={C.muted2}>Finished rounds will show up here.</Body>}
              {history.slice(0, 4).map((r) => (
                <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Thumb letter={r.courseName[0]} size={38} />
                  <View style={{ flex: 1 }}>
                    <Body size={13} weight="600" color={C.textStrong}>{r.courseName}</Body>
                    <Body size={11} color={C.muted2}>{new Date(r.playedAt).toLocaleDateString()} · {r.holes} holes</Body>
                  </View>
                  <Serif size={17}>{String(r.total)}</Serif>
                  <Body size={12} weight="700" color={r.relPar <= 0 ? C.birdieFg : C.clay}>{r.relPar === 0 ? 'E' : r.relPar > 0 ? `+${r.relPar}` : r.relPar}</Body>
                </View>
              ))}
            </View>
          </Panel>

          <Panel title="Friends leaderboard">
            <View style={{ gap: 8 }}>
              {FRIENDS.map((f) => (
                <View key={f.rank} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: f.you ? C.bogeyBg : 'transparent', borderRadius: 10, padding: 8 }}>
                  <Mono size={11} color={f.you ? C.clay : C.muted}>{String(f.rank)}</Mono>
                  <Avatar initials={f.initials} size={30} bg={f.you ? C.clay : C.forest2} />
                  <View style={{ flex: 1 }}>
                    <Body size={13} weight="600" color={C.textStrong}>{f.name}</Body>
                    <Body size={11} color={C.muted2}>{f.meta}</Body>
                  </View>
                  <Serif size={16}>{String(f.rating)}</Serif>
                </View>
              ))}
            </View>
            <Mono size={9} color={C.muted} style={{ marginTop: 8 }} caps={false}>Live leaderboard requires accounts — see BUILD_PLAN §3 follows table</Mono>
          </Panel>

          <Panel title="In the bag" action="Manage →" onAction={() => router.push('/bag')}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {bag.discs.slice(0, 8).map((d) => (
                <View key={d.id} style={{ width: '22.5%', aspectRatio: 1, borderRadius: 999, backgroundColor: C.tintGreen, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
                  <Serif size={18} weight="800" color={C.forest2}>{String(d.speed)}</Serif>
                  <Body size={8} color={C.muted2} numberOfLines={1}>{d.name}</Body>
                </View>
              ))}
            </View>
          </Panel>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
