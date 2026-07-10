// Score visual language, reused everywhere scores appear (README §tokens).
import React from 'react';
import { View } from 'react-native';
import { Serif, Body } from './Type';
import { scoreStyle, C } from '@/theme/tokens';

export function ScoreChip({ strokes, par, size = 28 }: { strokes: number; par: number; size?: number }) {
  const s = scoreStyle(strokes, par);
  if (!s) return <Serif size={size * 0.6} color={C.text}>{String(strokes)}</Serif>;
  return (
    <View style={{ width: size, height: size, borderRadius: s.circle ? size / 2 : 6, backgroundColor: s.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Serif size={size * 0.55} color={s.fg}>{String(strokes)}</Serif>
    </View>
  );
}

export function RelBadge({ rel }: { rel: number }) {
  const color = rel < 0 ? C.birdieFg : rel > 0 ? C.clay : C.muted2;
  return <Body size={13} weight="700" color={color}>{rel === 0 ? 'E' : rel > 0 ? `+${rel}` : `${rel}`}</Body>;
}
