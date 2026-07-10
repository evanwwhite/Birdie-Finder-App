// Data-provenance badges — a deliberate product value; keep it (README §tokens).
import React from 'react';
import { View } from 'react-native';
import { Mono } from './Type';
import { C } from '@/theme/tokens';

export function ProvenancePill({ kind, label }: { kind: 'real' | 'est' | 'ok' | 'weak'; label: string }) {
  const green = kind === 'real' || kind === 'ok';
  const bg = green ? C.tintGreen : C.warnBg;
  const fg = green ? C.birdieFg : C.warnFg;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: bg, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4, alignSelf: 'flex-start' }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: fg }} />
      <Mono size={10} color={fg}>{label}</Mono>
    </View>
  );
}
