import React from 'react';
import { Pressable, View } from 'react-native';
import { Serif, Body } from './Type';
import { C } from '@/theme/tokens';

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 22, marginBottom: 10 }}>
      <Serif size={18}>{title}</Serif>
      {action && (
        <Pressable onPress={onAction}><Body size={13} weight="600" color={C.clay}>{action}</Body></Pressable>
      )}
    </View>
  );
}
