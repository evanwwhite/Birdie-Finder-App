import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Spectral_600SemiBold, Spectral_700Bold, Spectral_800ExtraBold } from '@expo-google-fonts/spectral';
import { Archivo_400Regular, Archivo_500Medium, Archivo_600SemiBold, Archivo_700Bold, Archivo_800ExtraBold } from '@expo-google-fonts/archivo';
import { IBMPlexMono_400Regular, IBMPlexMono_500Medium, IBMPlexMono_600SemiBold } from '@expo-google-fonts/ibm-plex-mono';
import { AppState, View } from 'react-native';
import { C } from '@/theme/tokens';
import { ToastProvider } from '@/components/Toast';
import { useRound } from '@/state/round';
import { supabase } from '@/lib/supabase';

export default function RootLayout() {
  React.useEffect(() => {
    void useRound.getState().hydrate().then(() => useRound.getState().refreshAll());
    let observedUserId: string | null | undefined;
    const auth = supabase?.auth.onAuthStateChange((_event, session) => {
      const userId = session?.user.id ?? null;
      if (userId === observedUserId) return;
      observedUserId = userId;
      useRound.setState({ live: null, history: [], hydrated: false });
      setTimeout(() => {
        void useRound.getState().hydrate().then(() => useRound.getState().refreshAll());
      }, 0);
    });
    const app = AppState.addEventListener('change', state => {
      if (state === 'active') void useRound.getState().syncPending();
    });
    const retry = setInterval(() => { if (AppState.currentState === 'active') void useRound.getState().syncPending(); }, 15000);
    return () => { auth?.data.subscription.unsubscribe(); app.remove(); clearInterval(retry); };
  }, []);
  const [loaded] = useFonts({
    Spectral_600SemiBold, Spectral_700Bold, Spectral_800ExtraBold,
    Archivo_400Regular, Archivo_500Medium, Archivo_600SemiBold, Archivo_700Bold, Archivo_800ExtraBold,
    IBMPlexMono_400Regular, IBMPlexMono_500Medium, IBMPlexMono_600SemiBold,
  });
  if (!loaded) return <View style={{ flex: 1, backgroundColor: C.paper }} />;
  return (
    <ToastProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: C.paper },
          animation: 'slide_from_right',
          animationDuration: 250,
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="course/[id]" />
        <Stack.Screen name="summary" />
        <Stack.Screen name="bag" />
        <Stack.Screen name="catalog" options={{ presentation: 'modal' }} />
        <Stack.Screen name="login" options={{ presentation: 'modal' }} />
      </Stack>
    </ToastProvider>
  );
}
