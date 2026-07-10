import React from 'react';
import { View } from 'react-native';
import { Body } from './Type';
import { C } from '@/theme/tokens';

export function Avatar({ initials, size = 36, bg = C.clay, ring = false }: { initials: string; size?: number; bg?: string; ring?: boolean }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center',
      borderWidth: ring ? 2 : 0, borderColor: '#8fd08f' }}>
      <Body size={size * 0.36} weight="700" color={C.paper}>{initials}</Body>
    </View>
  );
}
