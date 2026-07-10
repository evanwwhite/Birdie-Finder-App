import React from 'react';
import { Pressable, View } from 'react-native';
import { Serif, Body, Mono } from './Type';
import { C, R, shadow } from '@/theme/tokens';
import { Course } from '@/lib/types';

function Thumb({ letter, size = 54 }: { letter: string; size?: number }) {
  // Striped placeholder thumb (production: real course imagery)
  return (
    <View style={{ width: size, height: size, borderRadius: 12, backgroundColor: C.tile, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ position: 'absolute', top: i * (size / 3), left: -size, width: size * 3, height: size / 6, backgroundColor: C.paper2, transform: [{ rotate: '-18deg' }] }} />
      ))}
      <Serif size={size * 0.4} color={C.forest2}>{letter}</Serif>
    </View>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <View style={{ backgroundColor: C.tintGreen, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3 }}>
      <Body size={11} weight="600" color={C.forest2}>{label}</Body>
    </View>
  );
}

export function CourseCard({ course, selected, onPress }: { course: Course; selected?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[{
      flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: C.card,
      borderRadius: R.card, padding: 12, borderWidth: selected ? 2 : 1,
      borderColor: selected ? C.clay : C.border,
    }, shadow.card]}>
      <Thumb letter={course.name[0]} />
      <View style={{ flex: 1, gap: 3 }}>
        <Serif size={16}>{course.name}</Serif>
        <Body size={12} color={C.muted2}>{course.city} · {course.holes} holes · par {course.par}</Body>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
          <Chip label={course.difficulty} />
          <Chip label={course.terrain} />
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        {course.distanceMi != null && <Mono size={12} color={C.clay}>{course.distanceMi.toFixed(1)} mi</Mono>}
        <Body size={12} weight="600" color={C.muted2}>★ {course.rating.toFixed(1)}</Body>
      </View>
    </Pressable>
  );
}
export { Thumb };
