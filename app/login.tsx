// Auth (BUILD_PLAN §6): email + Apple Sign In via Supabase.
// Runs in demo mode until Supabase env vars are set.
import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Serif, Body, Mono } from '@/components/Type';
import { useToast } from '@/components/Toast';
import { C, GUTTER, F } from '@/theme/tokens';
import { supabase, supabaseEnabled } from '@/lib/supabase';

export default function Login() {
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');

  const signIn = async () => {
    if (!supabaseEnabled) { toast('Demo mode — connect Supabase to enable accounts'); router.back(); return; }
    const { error } = await supabase!.auth.signInWithPassword({ email, password: pw });
    if (error) toast(error.message); else { toast('Signed in'); router.back(); }
    // TODO on first login: migrate localStorage/AsyncStorage rounds + bag to the account (BUILD_PLAN §6), idempotently.
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.paper, padding: GUTTER, gap: 14 }} edges={['top']}>
      <Mono size={10}>Welcome back</Mono>
      <Serif size={28} weight="800">Log in to Birdie Finder</Serif>
      <TextInput value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" keyboardType="email-address" placeholderTextColor={C.muted}
        style={{ backgroundColor: C.tile, borderRadius: 12, padding: 14, fontFamily: F.sansMed, fontSize: 15, color: C.text }} />
      <TextInput value={pw} onChangeText={setPw} placeholder="Password" secureTextEntry placeholderTextColor={C.muted}
        style={{ backgroundColor: C.tile, borderRadius: 12, padding: 14, fontFamily: F.sansMed, fontSize: 15, color: C.text }} />
      <Pressable onPress={signIn} style={{ backgroundColor: C.clay, borderRadius: 14, paddingVertical: 15, alignItems: 'center' }}>
        <Body size={15} weight="700" color={C.paper}>Log in</Body>
      </Pressable>
      <Pressable onPress={() => toast(supabaseEnabled ? 'Apple Sign In: configure in Supabase Auth' : 'Demo mode')}
        style={{ backgroundColor: '#000', borderRadius: 14, paddingVertical: 15, alignItems: 'center' }}>
        <Body size={15} weight="700" color="#fff"> Sign in with Apple</Body>
      </Pressable>
      <Body size={12} color={C.muted2} style={{ textAlign: 'center' }}>
        Your saved rounds and bag migrate to your account on first login — nothing is lost.
      </Body>
    </SafeAreaView>
  );
}
