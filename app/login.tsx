import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { Serif, Body, Mono } from '@/components/Type';
import { C, GUTTER, F } from '@/theme/tokens';
import { supabase } from '@/lib/supabase';
import { useRound } from '@/state/round';

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup' | 'reset' | 'newPassword'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const submit = async () => {
    if (!supabase) { setMessage('Account connection is unavailable.'); return; }
    setMessage('');
    try {
      if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: 'birdiefinder://login' });
        if (error) throw error;
        setMessage('Check your email for a password reset link.');
        return;
      }
      if (mode === 'newPassword') {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setMode('login'); setMessage('Password updated.'); return;
      }
      const result = mode === 'signup'
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      if (!result.data.session) { setMessage('Check your email to confirm your account, then sign in.'); return; }
      if (!result.data.user) throw new Error('Account was not returned.');
      const profile = await supabase.from('profiles').upsert({ user_id: result.data.user.id }, { onConflict: 'user_id' });
      if (profile.error) throw profile.error;
      await useRound.getState().hydrate();
      router.back();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Account request failed'); }
  };
  React.useEffect(() => {
    const listener = supabase?.auth.onAuthStateChange(event => {
      if (event === 'PASSWORD_RECOVERY') setMode('newPassword');
    });
    const recover = async (url: string | null) => {
      if (!url || !supabase) return;
      try {
        const parsed = new URL(url);
        const params = new URLSearchParams(parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.search.slice(1));
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        if (!access_token || !refresh_token || params.get('type') !== 'recovery') return;
        const result = await supabase.auth.setSession({ access_token, refresh_token });
        if (result.error) setMessage(result.error.message);
        else setMode('newPassword');
      } catch (error) { setMessage(error instanceof Error ? error.message : 'Recovery link could not be opened.'); }
    };
    void Linking.getInitialURL().then(recover);
    const link = Linking.addEventListener('url', event => { void recover(event.url); });
    return () => { listener?.data.subscription.unsubscribe(); link.remove(); };
  }, []);
  return <SafeAreaView style={{ flex: 1, backgroundColor: C.paper, padding: GUTTER, gap: 14 }} edges={['top']}>
    <Mono size={10}>Birdie Finder account</Mono>
    <Serif size={28} weight="800">{mode === 'signup' ? 'Create account' : mode === 'reset' ? 'Reset password' : mode === 'newPassword' ? 'Choose a new password' : 'Log in'}</Serif>
    {mode !== 'newPassword' && <TextInput value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" keyboardType="email-address" placeholderTextColor={C.muted}
      style={{ backgroundColor: C.tile, borderRadius: 12, padding: 14, fontFamily: F.sansMed, fontSize: 15, color: C.text }} />}
    {mode !== 'reset' && <TextInput value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry placeholderTextColor={C.muted}
      style={{ backgroundColor: C.tile, borderRadius: 12, padding: 14, fontFamily: F.sansMed, fontSize: 15, color: C.text }} />}
    <Pressable onPress={submit} style={{ backgroundColor: C.clay, borderRadius: 14, paddingVertical: 15, alignItems: 'center' }}><Body size={15} weight="700" color={C.paper}>Continue</Body></Pressable>
    {!!message && <Body size={13} color={C.clay}>{message}</Body>}
    <Pressable onPress={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setMessage(''); }}><Body color={C.forest}>{mode === 'signup' ? 'Already have an account? Log in' : 'Create an account'}</Body></Pressable>
    <Pressable onPress={() => { setMode(mode === 'reset' ? 'login' : 'reset'); setMessage(''); }}><Body color={C.forest}>{mode === 'reset' ? 'Back to login' : 'Forgot password?'}</Body></Pressable>
    <Body size={12} color={C.muted2}>Existing anonymous rounds stay on this device until you choose to claim them for an account.</Body>
  </SafeAreaView>;
}
