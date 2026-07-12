import React, { useRef } from 'react';
import { Pressable, ScrollView, Share, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import ViewShot from 'react-native-view-shot';
import { Serif, Body, Mono } from '@/components/Type';
import { ScoreChip } from '@/components/ScoreChip';
import { useToast } from '@/components/Toast';
import { C, GUTTER, R, shadow, relParLabel } from '@/theme/tokens';
import { useRound, playerTotals } from '@/state/round';

export default function Summary() {
  const router = useRouter();
  const toast = useToast();
  const round = useRound((s) => s.history[0]);
  const shot = useRef<ViewShot>(null);

  if (!round) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center' }}>
        <Body>No finished rounds yet.</Body>
      </SafeAreaView>
    );
  }

  const rows = round.players.map((p) => {
    const t = playerTotals(round.scores[p.id], round.pars);
    return { ...p, ...t };
  });
  const winner = [...rows].sort((a, b) => a.rel - b.rel)[0];
  const you = rows[0];
  const birdies = round.pars.filter((par, i) => (round.scores[you.id][i + 1] ?? par) < par).length;
  const parsCount = round.pars.filter((par, i) => (round.scores[you.id][i + 1] ?? par) === par).length;

  const share = async () => {
    try {
      const uri = await shot.current?.capture?.();
      if (uri) await Share.share({ url: uri, message: `${round.courseName} — ${you.total} (${relParLabel(you.rel)})` });
    } catch { toast('Could not export the card'); }
  };

  const Stat = ({ label, value }: { label: string; value: string }) => (
    <View style={[{ flex: 1, backgroundColor: C.card, borderRadius: R.card, borderWidth: 1, borderColor: C.border, padding: 12, alignItems: 'center', gap: 4 }, shadow.card]}>
      <Serif size={22} weight="800">{value}</Serif>
      <Mono size={9} color={C.muted}>{label}</Mono>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.paper }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: GUTTER, paddingVertical: 6 }}>
        <Pressable onPress={() => router.back()} style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: C.tile, alignItems: 'center', justifyContent: 'center' }}>
          <Body size={18} weight="700">‹</Body>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: GUTTER, paddingBottom: 40 }}>
        <Mono size={10}>{round.courseName} · {round.layout} layout · {round.holes} holes</Mono>
        <Serif size={30} weight="800" style={{ marginTop: 4 }}>Nice round.</Serif>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: C.forest, borderRadius: 999, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, marginTop: 12 }}>
          <Body size={13} weight="700" color={C.paper}>★ {winner.name} wins · {relParLabel(winner.rel)}</Body>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
          <Stat label="Your score" value={String(you.total)} />
          <Stat label="vs par" value={relParLabel(you.rel)} />
          <Stat label="Birdies" value={String(birdies)} />
          <Stat label="Pars" value={String(parsCount)} />
        </View>

        {/* scorecard grid — horizontal scroll, sticky first column; exports as a clean image */}
        <ViewShot ref={shot} options={{ format: 'png', quality: 1 }} style={{ marginTop: 16, backgroundColor: C.paper }}>
          <View style={[{ flexDirection: 'row', backgroundColor: C.card, borderRadius: R.card, borderWidth: 1, borderColor: C.border, overflow: 'hidden' }, shadow.card]}>
            {/* sticky names column */}
            <View style={{ borderRightWidth: 1, borderColor: C.border }}>
              <Cell text="" head />
              <Cell text="Par" mono />
              {rows.map((r) => <Cell key={r.id} text={r.name} bold wide win={r.id === winner.id} />)}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                <View style={{ flexDirection: 'row' }}>
                  {round.pars.map((_, i) => <Cell key={i} text={String(i + 1)} head />)}
                  <Cell text="Tot" head /><Cell text="±" head />
                </View>
                <View style={{ flexDirection: 'row' }}>
                  {round.pars.map((p, i) => <Cell key={i} text={String(p)} mono />)}
                  <Cell text={String(round.pars.reduce((a, b) => a + b, 0))} mono /><Cell text="" mono />
                </View>
                {rows.map((r) => (
                  <View key={r.id} style={{ flexDirection: 'row', backgroundColor: r.id === winner.id ? C.bogeyBg : 'transparent' }}>
                    {round.pars.map((par, i) => {
                      const s = round.scores[r.id][i + 1];
                      return (
                        <View key={i} style={{ width: 34, height: 36, alignItems: 'center', justifyContent: 'center' }}>
                          {s != null ? <ScoreChip strokes={s} par={par} size={24} /> : <Body size={12} color={C.muted}>·</Body>}
                        </View>
                      );
                    })}
                    <Cell text={String(r.total)} bold /><Cell text={relParLabel(r.rel)} bold />
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </ViewShot>

        <View style={{ flexDirection: 'row', gap: 16, marginTop: 10, justifyContent: 'center' }}>
          <Legend bg={C.birdieBg} fg={C.birdieFg} circle label="Birdie" />
          <Legend bg={C.bogeyBg} fg={C.bogeyFg} label="Bogey" />
          <Legend bg={C.doubleBg} fg={C.doubleFg} label="Double+" />
        </View>

        <View style={{ gap: 10, marginTop: 20 }}>
          <Pressable onPress={() => { toast('Round saved to your profile'); router.push('/stats'); }}
            style={{ borderRadius: 14, paddingVertical: 15, alignItems: 'center', borderWidth: 1.5, borderColor: C.forest }}>
            <Body size={15} weight="700" color={C.forest}>Save to profile</Body>
          </Pressable>
          <Pressable onPress={share} style={{ backgroundColor: C.clay, borderRadius: 14, paddingVertical: 15, alignItems: 'center' }}>
            <Body size={15} weight="700" color={C.paper}>Share round image ▸</Body>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Cell({ text, head, mono, bold, win, wide }: { text: string; head?: boolean; mono?: boolean; bold?: boolean; win?: boolean; wide?: boolean }) {
  return (
    <View style={{ width: wide ? undefined : 34, minWidth: wide ? 72 : 34, paddingHorizontal: wide ? 10 : 6, height: 36, alignItems: wide ? 'flex-start' : 'center', justifyContent: 'center', backgroundColor: win ? C.bogeyBg : 'transparent' }}>
      {head ? <Mono size={9} color={C.muted}>{text}</Mono>
        : mono ? <Mono size={10} color={C.muted2} caps={false}>{text}</Mono>
        : <Body size={12} weight={bold ? '700' : '400'} color={C.textStrong} numberOfLines={1}>{text}</Body>}
    </View>
  );
}

function Legend({ bg, fg, circle, label }: { bg: string; fg: string; circle?: boolean; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 12, height: 12, borderRadius: circle ? 6 : 3, backgroundColor: bg, borderWidth: 1.5, borderColor: fg }} />
      <Body size={11} color={C.muted2}>{label}</Body>
    </View>
  );
}
