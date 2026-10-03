import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Body, Serif } from '@/components/Type';
import { C, GUTTER } from '@/theme/tokens';
import { supabase } from '@/lib/supabase';
import { useRound } from '@/state/round';
import { previewAppRounds, previewAppBag, type LegacyCandidate } from '@/lib/legacyImport';
import { importAppBagDisc, importAppRound } from '@/lib/importAppLegacy';
import * as Crypto from 'expo-crypto';

type BagItem = { id: string; disc_mold_id: string; name?: string; manufacturer?: string };
export function PublicBag() {
  const router = useRouter(), [items,setItems] = useState<BagItem[]>([]), [message,setMessage] = useState('');
  const generation = React.useRef(0);
  const load = async () => {
    const requestId = ++generation.current;
    if (!supabase) return;
    const rows = await supabase.from('bag_items').select('id,disc_mold_id').order('added_at');
    if (requestId !== generation.current) return;
    if (rows.error) { setMessage(rows.error.message); return; }
    const ids = (rows.data ?? []).map(r => r.disc_mold_id);
    const molds = ids.length ? await supabase.from('disc_molds').select('id,name,manufacturer').in('id',ids) : null;
    if (requestId !== generation.current) return;
    const byId = new Map((molds?.data ?? []).map(d => [d.id,d]));
    setItems((rows.data ?? []).map(r => ({ ...r, ...byId.get(r.disc_mold_id) })));
  };
  useFocusEffect(React.useCallback(() => { void load(); }, []));
  useEffect(() => {
    const sub = supabase?.auth.onAuthStateChange(() => { generation.current++; setItems([]); setTimeout(() => { void load(); },0); });
    return () => sub?.data.subscription.unsubscribe();
  },[]);
  const remove = async (id: string) => {
    if (!supabase) return;
    const result = await supabase.from('bag_items').delete().eq('id',id);
    if (result.error) setMessage(result.error.message); else void load();
  };
  return <SafeAreaView style={{ flex: 1, backgroundColor:C.paper }}><ScrollView contentContainerStyle={{ padding:GUTTER,gap:12 }}>
    <Serif size={26}>My account bag</Serif><Body>Approved disc molds saved here sync with your account.</Body>
    {!!message && <Body>{message}</Body>}{!items.length && <Body>No approved discs in your account bag.</Body>}
    {items.map(item => <View key={item.id} style={{ backgroundColor:C.card,padding:12,borderRadius:10 }}>
      <Body>{item.manufacturer} {item.name}</Body><Pressable onPress={() => void remove(item.id)}><Body color={C.clay}>Remove</Body></Pressable>
    </View>)}
    <Pressable onPress={() => router.push('/catalog')}><Body color={C.clay}>Browse approved discs →</Body></Pressable>
  </ScrollView></SafeAreaView>;
}

export function PublicStats() {
  const router = useRouter();
  const history = useRound(s => s.history);
  const [message,setMessage] = useState(''), [legacy,setLegacy] = useState('');
  const [anonymousCount,setAnonymousCount] = useState(0);
  const [legacyOwner,setLegacyOwner] = useState('');
  const [candidates,setCandidates] = useState<Array<LegacyCandidate & { review: string }>>([]);
  const [deviceId,setDeviceId] = useState(''), [roundRaw,setRoundRaw] = useState(''), [bagRaw,setBagRaw] = useState('');
  useEffect(() => {
    const sub = supabase?.auth.onAuthStateChange(() => {
      setCandidates([]); setRoundRaw(''); setBagRaw(''); setLegacyOwner('');
    });
    return () => sub?.data.subscription.unsubscribe();
  },[]);
  useEffect(() => {
    setAnonymousCount(useRound.getState().anonymousRoundCount());
    void (async () => {
      const current = (await supabase?.auth.getUser())?.data.user?.id;
      const bound = await AsyncStorage.getItem('bf_legacy_claim_owner_v1');
      if (!current || bound !== current) {
        setLegacy(bound ? 'Old local data is claimed by a different account on this device.' :
          'Old local data requires an explicit claim before preview or import.');
        setCandidates([]); setLegacyOwner(bound ?? 'unclaimed'); return;
      }
      setLegacyOwner(bound);
      let deviceId = await AsyncStorage.getItem('bf_import_device_v1');
      if (!deviceId) { deviceId = Crypto.randomUUID(); await AsyncStorage.setItem('bf_import_device_v1',deviceId); }
      setDeviceId(deviceId);
      const [rounds,bag] = await Promise.all([
        AsyncStorage.getItem('bf_rounds_v1'),AsyncStorage.getItem('bf_bag_v1')]);
      setRoundRaw(rounds ?? ''); setBagRaw(bag ?? '');
      const rp = await previewAppRounds(rounds ?? '',deviceId);
      const bp = await previewAppBag(bag ?? '',deviceId);
      if ((await supabase?.auth.getUser())?.data.user?.id !== current) return;
      setLegacy(`${rp.records.length} old rounds and ${bp.records.length} old bag discs on this device; import needs reviewed catalog matches.`);
      const receiptResult = await supabase?.rpc('list_legacy_import_receipts_v1',{p_device_id:deviceId});
      const received = new Set((receiptResult?.data ?? []).map((r: { record_id: string }) => r.record_id));
      const all = [...rp.records,...bp.records];
      const reviews = await Promise.all(all.map(async candidate => {
        if (received.has(candidate.recordId)) return { ...candidate,review:'imported' };
        if (!supabase || !candidate.sourceId) return { ...candidate,review:'ambiguous' };
        const table = candidate.kind === 'app_round' ? 'course_external_ids' : 'disc_external_ids';
        const column = candidate.kind === 'app_round' ? 'course_id' : 'disc_mold_id';
        const result = await supabase.from(table).select(column).eq('provider','legacy_app')
          .eq('external_id',candidate.sourceId).maybeSingle();
        if (candidate.kind === 'app_round' && result.data && !__DEV__) {
          const courseId = (result.data as {course_id:string}).course_id;
          const approved = await supabase.from('courses').select('id').eq('id',courseId)
            .eq('published',true).eq('synthetic',false).maybeSingle();
          return { ...candidate,review:approved.data ? 'ready' : 'ambiguous' };
        }
        return { ...candidate,review:result.data ? 'ready' : 'ambiguous' };
      }));
      if ((await supabase?.auth.getUser())?.data.user?.id === current) setCandidates(reviews);
    })();
  },[legacyOwner]);
  const exportData = async () => {
    if (!supabase) return;
    const result = await supabase.rpc('export_account_v1');
    if (result.error || !result.data) { setMessage(result.error?.message ?? 'Sign in to export.'); return; }
    const current = (await supabase.auth.getUser()).data.user?.id;
    const owner = await AsyncStorage.getItem('bf_legacy_claim_owner_v1');
    const oldRound = current === owner ? await AsyncStorage.getItem('bf_rounds_v1') : null;
    const oldBag = current === owner ? await AsyncStorage.getItem('bf_bag_v1') : null;
    await Share.share({ message: JSON.stringify({account:result.data,local_legacy_rounds:oldRound,local_legacy_bag:oldBag},null,2) });
  };
  const deleteAccount = () => Alert.alert('Delete account and synced data?',
    'This permanently removes the account, saved rounds, bag, and import receipts. Export first if needed.',[
      {text:'Cancel',style:'cancel'}, {text:'Delete',style:'destructive',onPress:() => void (async () => {
        const result = await supabase?.rpc('delete_account_v1',{p_confirmation:'DELETE MY BIRDIE FINDER ACCOUNT'});
        if (result?.error) { setMessage(result.error.message); return; }
        await supabase?.auth.signOut(); await useRound.getState().hydrate(); setMessage('Account deleted.');
      })()},
    ]);
  const importOne = async (candidate: LegacyCandidate) => {
    try {
      if (candidate.kind === 'app_round') await importAppRound(candidate,roundRaw,deviceId);
      else await importAppBagDisc(candidate,bagRaw,deviceId);
      setCandidates(old => old.map(c => c.recordId === candidate.recordId ? { ...c,review:'imported' } : c));
      setMessage('Record saved to the account and acknowledged. Original local data is unchanged.');
      await useRound.getState().refreshAll();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Import failed'); }
  };
  const claimLegacy = () => Alert.alert('Claim old local data?',
    'Only this account will be allowed to preview, import, or export the old device stores.',[
      {text:'Cancel',style:'cancel'}, {text:'Claim',onPress:() => void (async () => {
        const userId = (await supabase?.auth.getUser())?.data.user?.id;
        if (!userId) { setMessage('Sign in before claiming old data.'); return; }
        await AsyncStorage.setItem('bf_legacy_claim_owner_v1',userId);
        setLegacyOwner(userId);
      })()},
    ]);
  return <SafeAreaView style={{ flex:1,backgroundColor:C.paper }}><ScrollView contentContainerStyle={{ padding:GUTTER,gap:14 }}>
    <Serif size={26}>My rounds and account</Serif><Body>{history.length} completed round{history.length === 1 ? '' : 's'} on this device.</Body>
    {history.map(r => <View key={r.id} style={{ backgroundColor:C.card,padding:12,borderRadius:10 }}>
      <Body>{r.courseName} · {new Date(r.playedAt).toLocaleDateString()} · {r.total} strokes</Body>
      <Body size={11}>{r.relPar == null ? 'Par unknown' : `Versus par ${r.relPar}`}</Body>
    </View>)}
    {!!legacy && <Body size={12}>{legacy}</Body>}
    {legacyOwner === 'unclaimed' && <Pressable onPress={claimLegacy}><Body color={C.clay}>Claim old device data for this account</Body></Pressable>}
    {candidates.map(c => <View key={c.recordId} style={{ backgroundColor:C.card,padding:10,borderRadius:8 }}>
      <Body size={12}>{c.kind === 'app_round' ? 'Old round' : 'Old bag disc'} #{c.index+1} · {c.sourceId || 'unknown ID'} · {c.review}</Body>
      {c.review === 'ready' && <Pressable onPress={() => void importOne(c)}><Body color={C.clay}>Import this record</Body></Pressable>}
    </View>)}
    {anonymousCount > 0 && <Pressable onPress={() => Alert.alert('Claim local rounds?',
      `Upload ${anonymousCount} anonymous round(s) to the currently signed-in account.`,[
        {text:'Cancel',style:'cancel'}, {text:'Claim',onPress:() => void useRound.getState().claimAnonymousRounds()
          .then(n => { setAnonymousCount(0); setMessage(`${n} local rounds claimed.`); })
          .catch(e => setMessage(e.message))},
      ])}><Body color={C.clay}>Claim {anonymousCount} anonymous round(s)</Body></Pressable>}
    <Pressable onPress={() => router.push('/bag')}><Body color={C.clay}>My synced bag →</Body></Pressable>
    <Pressable onPress={() => void exportData()}><Body color={C.clay}>Export account and old local data</Body></Pressable>
    <Pressable onPress={() => void (async () => {
      await supabase?.auth.signOut(); await useRound.getState().hydrate();
      router.push('/login');
    })()}><Body color={C.clay}>Sign out</Body></Pressable>
    <Pressable onPress={deleteAccount}><Body color={C.clay}>Delete account and synced data</Body></Pressable>
    {!!message && <Body>{message}</Body>}
  </ScrollView></SafeAreaView>;
}
