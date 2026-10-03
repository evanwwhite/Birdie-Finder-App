import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Serif, Body, Mono } from '@/components/Type';
import { C, GUTTER, R } from '@/theme/tokens';
import { useRound } from '@/state/round';

export default function Summary() {
  const router = useRouter();
  const round = useRound(s => s.history[0]);
  if (!round) return <SafeAreaView style={{ flex: 1, padding: GUTTER, backgroundColor: C.paper }}><Body>No finished rounds yet.</Body></SafeAreaView>;
  return <SafeAreaView style={{ flex: 1, backgroundColor: C.paper }} edges={['top']}>
    <ScrollView contentContainerStyle={{ padding: GUTTER, gap: 14 }}>
      <Mono size={11}>{round.courseName} · {round.layout}</Mono>
      <Serif size={30} weight="800">Round complete</Serif>
      <Body size={17} weight="700">{round.total} strokes · {round.relPar === null ? 'Par unknown' : round.relPar === 0 ? 'Even par' : `${round.relPar > 0 ? '+' : ''}${round.relPar} vs par`}</Body>
      {round.pars.map((par, i) => <View key={i} style={{ padding: 15, backgroundColor: C.card, borderRadius: R.card, flexDirection: 'row', justifyContent: 'space-between' }}>
        <Body>Hole {i + 1} · Par {par ?? 'unknown'}</Body>
        <Body weight="700">{round.scores[round.participantId][i + 1] ?? '—'}</Body>
      </View>)}
      <Body size={12} color={C.muted2}>Saved on this phone. Account rounds sync when a connection is available.</Body>
      <Pressable onPress={() => { void useRound.getState().refreshAll(); }} style={{ padding: 14, backgroundColor: C.tile, borderRadius: 12, alignItems: 'center' }}><Body>Refresh account scores</Body></Pressable>
      <Pressable onPress={() => router.push('/stats')} style={{ padding: 16, backgroundColor: C.clay, borderRadius: 12, alignItems: 'center' }}><Body color={C.paper} weight="700">Done</Body></Pressable>
    </ScrollView>
  </SafeAreaView>;
}
