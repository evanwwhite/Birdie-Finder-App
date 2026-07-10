import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { C, F } from '@/theme/tokens';

export const Serif = (p: TextProps & { size?: number; weight?: '600' | '700' | '800'; color?: string }) => (
  <Text {...p} style={[{ fontFamily: p.weight === '800' ? F.serif800 : p.weight === '600' ? F.serif600 : F.serif, fontSize: p.size ?? 19, color: p.color ?? C.forest }, p.style]} />
);

export const Mono = (p: TextProps & { size?: number; color?: string; caps?: boolean; ls?: number }) => (
  <Text {...p} style={[{ fontFamily: F.monoSemi, fontSize: p.size ?? 11, color: p.color ?? C.gold, letterSpacing: (p.ls ?? 0.08) * (p.size ?? 11), textTransform: p.caps === false ? 'none' : 'uppercase' } as TextStyle, p.style]} />
);

export const Body = (p: TextProps & { size?: number; color?: string; weight?: keyof typeof map }) => (
  <Text {...p} style={[{ fontFamily: map[p.weight ?? '400'], fontSize: p.size ?? 14, color: p.color ?? C.text }, p.style]} />
);
const map = { '400': F.sans, '500': F.sansMed, '600': F.sansSemi, '700': F.sansBold, '800': F.sansX } as const;
