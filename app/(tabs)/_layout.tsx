// Tab bar: Home · Courses · Play · Stats (README §navigation model)
import React from 'react';
import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { C, F } from '@/theme/tokens';

function Dot({ focused, shape }: { focused: boolean; shape: 'ring' | 'square' | 'disc' | 'bars' }) {
  const color = focused ? C.forest : C.muted;
  if (shape === 'ring') return <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2.5, borderColor: color }} />;
  if (shape === 'square') return <View style={{ width: 18, height: 18, borderRadius: 5, borderWidth: 2.5, borderColor: color }} />;
  if (shape === 'disc') return <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: color }} />;
  return (
    <View style={{ flexDirection: 'row', gap: 3, alignItems: 'flex-end', height: 20 }}>
      {[10, 16, 13].map((h, i) => <View key={i} style={{ width: 4, height: h, borderRadius: 2, backgroundColor: color }} />)}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.forest,
        tabBarInactiveTintColor: C.muted,
        tabBarStyle: { backgroundColor: C.paper, borderTopColor: C.border, height: 84, paddingTop: 8 },
        tabBarLabelStyle: { fontFamily: F.sansSemi, fontSize: 11 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ focused }) => <Dot focused={focused} shape="ring" /> }} />
      <Tabs.Screen name="courses" options={{ title: 'Courses', tabBarIcon: ({ focused }) => <Dot focused={focused} shape="square" /> }} />
      <Tabs.Screen name="play" options={{ title: 'Play', tabBarIcon: ({ focused }) => <Dot focused={focused} shape="disc" /> }} />
      <Tabs.Screen name="stats" options={{ title: 'Stats', tabBarIcon: ({ focused }) => <Dot focused={focused} shape="bars" /> }} />
    </Tabs>
  );
}
