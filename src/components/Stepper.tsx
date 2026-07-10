// 44x44 stepper with haptics on each tap (README §interactions).
import React from 'react';
import { Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Serif, Body } from './Type';
import { C } from '@/theme/tokens';

function Btn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
      style={({ pressed }) => ({
        width: 44, height: 44, borderRadius: 12, backgroundColor: pressed ? C.tile : C.tile2,
        borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center',
      })}
      hitSlop={4}
    >
      <Body size={22} weight="700" color={C.forest}>{label}</Body>
    </Pressable>
  );
}

export function Stepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Btn label="−" onPress={() => onChange(Math.max(1, value - 1))} />
      <Serif size={24} weight="800" style={{ minWidth: 30, textAlign: 'center' }}>{String(value)}</Serif>
      <Btn label="+" onPress={() => onChange(Math.min(12, value + 1))} />
    </View>
  );
}
