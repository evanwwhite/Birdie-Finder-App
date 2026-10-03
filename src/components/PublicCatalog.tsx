import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Body, Serif } from '@/components/Type';
import { C, GUTTER } from '@/theme/tokens';
import { supabase } from '@/lib/supabase';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveFavoriteCourse } from '@/lib/soloCatalog';

type Course = { id: string; name: string; city: string; state: string;
  reported_hole_count: number | null; data_version: string; attribution: string | null };
type Disc = { id: string; name: string; manufacturer: string; speed: number | null;
  glide: number | null; turn: number | null; fade: number | null; attribution: string; data_version: string };
type Detail = Course & { layouts: Array<{ name: string; versions: Array<{ id: string; version_no: number;
  holes: Array<{ id: string; hole_number: number; par: number | null; distance_ft: number | null }> }> }> };

export function PublicHome() {
  const router = useRouter();
  return <SafeAreaView style={{ flex: 1, backgroundColor: C.paper, padding: GUTTER, gap: 16 }}>
    <Serif size={30}>Birdie Finder</Serif>
    <Body>Find reviewed courses, score a solo round, and see your saved rounds.</Body>
    <Pressable onPress={() => router.push('/courses')}><Body color={C.clay}>Find courses →</Body></Pressable>
    <Pressable onPress={() => router.push('/play')}><Body color={C.clay}>Start a solo round →</Body></Pressable>
    <Pressable onPress={() => router.push('/stats')}><Body color={C.clay}>My rounds and account →</Body></Pressable>
  </SafeAreaView>;
}

export function PublicCourses() {
  const router = useRouter();
  const [query,setQuery] = useState(''), [items,setItems] = useState<Course[]>([]);
  const [offset,setOffset] = useState(0), [total,setTotal] = useState(0), [error,setError] = useState('');
  const [near,setNear] = useState<{lat:number;lon:number}|null>(null);
  const load = async (next = 0, search = query) => {
    if (!supabase) { setError('Catalog connection unavailable.'); return; }
    const result = await supabase.rpc('search_courses_v1', {
      p_query: search, p_lat: near?.lat ?? null, p_lon: near?.lon ?? null, p_limit: 20, p_offset: next });
    if (result.error) { setError(result.error.message); return; }
    const page = result.data as { total: number; items: Course[] };
    setItems(next ? old => [...old,...page.items] : page.items);
    setOffset(next + page.items.length); setTotal(page.total); setError('');
  };
  useEffect(() => { void load(0,''); }, []);
  const useLocation = async () => {
    try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') { setError('Location unavailable. Search by name or city.'); return; }
    const fix = await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced});
    const coords = {lat:Math.round(fix.coords.latitude*100)/100,
      lon:Math.round(fix.coords.longitude*100)/100};
    await AsyncStorage.setItem('bf_catalog_near_v1',JSON.stringify(coords));
    setNear(coords);
    if (!supabase) return;
    const result = await supabase.rpc('search_courses_v1',{
      p_query:query,p_lat:coords.lat,p_lon:coords.lon,p_limit:20,p_offset:0});
    if (result.error) { setError(result.error.message); return; }
    setItems(result.data.items as Course[]); setOffset(result.data.items.length);
    setTotal(result.data.total); setError('');
    } catch { setError('Location unavailable. Search by name or city.'); }
  };
  return <SafeAreaView style={{ flex: 1, backgroundColor: C.paper }}><ScrollView contentContainerStyle={{ padding: GUTTER, gap: 12 }}>
    <Serif size={26}>Approved courses</Serif><Body size={12}>Only reviewed catalog facts appear here. Unknown hole details stay unknown.</Body>
    <TextInput value={query} onChangeText={setQuery} placeholder="Search name or city" style={{ backgroundColor: C.tile, padding: 12, borderRadius: 10 }}
      onSubmitEditing={() => void load(0,query)} />
    <Pressable onPress={() => void load(0,query)}><Body color={C.clay}>Search</Body></Pressable>
    <Pressable onPress={() => void useLocation()}><Body color={C.clay}>Use my location for nearby courses</Body></Pressable>
    {!!error && <Body color={C.clay}>{error}</Body>}
    {!items.length && !error && <Body>No approved courses available for this search.</Body>}
    {items.map(c => <Pressable key={c.id} onPress={() => router.push(`/course/${c.id}`)}
      style={{ backgroundColor: C.card, padding: 14, borderRadius: 12 }}>
      <Serif size={17}>{c.name}</Serif><Body size={12}>{c.city}, {c.state} · {c.reported_hole_count ?? 'Unknown'} holes</Body>
      <Body size={10}>{c.attribution ?? ''} · {c.data_version}</Body>
    </Pressable>)}
    {offset < total && <Pressable onPress={() => void load(offset)}><Body color={C.clay}>Load more</Body></Pressable>}
  </ScrollView></SafeAreaView>;
}

export function PublicCourseDetail({ id }: { id: string }) {
  const [detail,setDetail] = useState<Detail | null>(null), [error,setError] = useState('');
  const [saved,setSaved] = useState(false);
  useEffect(() => {
    if (!supabase) { setError('Catalog connection unavailable.'); return; }
    void supabase.rpc('get_course_detail_v1',{p_id:id}).then(result => {
      if (result.error || !result.data) setError(result.error?.message ?? 'No approved course found.');
      else setDetail(result.data as Detail);
    });
  },[id]);
  return <SafeAreaView style={{ flex: 1, backgroundColor: C.paper }}><ScrollView contentContainerStyle={{ padding: GUTTER, gap: 12 }}>
    {!!error && <Body>{error}</Body>}{!detail && !error && <Body>Loading course…</Body>}
    {detail && <><Serif size={28}>{detail.name}</Serif><Body>{detail.city}, {detail.state}</Body>
      <Body size={11}>{detail.attribution ?? ''} · {detail.data_version}</Body>
      <Pressable onPress={() => { setSaved(saveFavoriteCourse(detail)); }}><Body color={C.clay}>{saved ? 'Saved for offline scorecards' : 'Save playable layout offline'}</Body></Pressable>
      {!detail.layouts.length && <Body>No verified playable layout is available.</Body>}
      {detail.layouts.map(l => <View key={l.name} style={{ gap: 6 }}><Serif size={20}>{l.name}</Serif>
        {l.versions.map(v => <View key={v.id} style={{ gap: 4 }}><Body>Version {v.version_no}</Body>
          {v.holes.map(h => <Body key={h.hole_number}>Hole {h.hole_number} · Par {h.par ?? 'unknown'} · {h.distance_ft == null ? 'Distance unknown' : `${h.distance_ft} ft`}</Body>)}
        </View>)}
      </View>)}
    </>}
  </ScrollView></SafeAreaView>;
}

export function PublicDiscs() {
  const [items,setItems] = useState<Disc[]>([]), [error,setError] = useState(''), [message,setMessage] = useState('');
  useEffect(() => { void supabase?.rpc('search_disc_molds_v1',{p_query:'',p_limit:50,p_offset:0}).then(result => {
    if (result.error) setError(result.error.message); else setItems((result.data?.items ?? []) as Disc[]);
  }); },[]);
  const add = async (disc: Disc) => {
    if (!supabase) return;
    const user = await supabase.auth.getUser();
    if (!user.data.user) { setMessage('Sign in to sync your bag.'); return; }
    const result = await supabase.from('bag_items').insert({ owner_id:user.data.user.id,disc_mold_id:disc.id });
    setMessage(result.error?.message ?? `${disc.name} saved to your account bag.`);
  };
  return <SafeAreaView style={{ flex: 1, backgroundColor: C.paper }}><ScrollView contentContainerStyle={{ padding: GUTTER, gap: 12 }}>
    <Serif size={26}>Approved disc molds</Serif><Body size={12}>Flight numbers appear only when reviewed.</Body>
    {!!error && <Body color={C.clay}>{error}</Body>}{!!message && <Body>{message}</Body>}
    {!items.length && !error && <Body>No approved disc molds are available yet.</Body>}
    {items.map(d => <View key={d.id} style={{ backgroundColor:C.card,padding:14,borderRadius:12 }}>
      <Serif size={17}>{d.manufacturer} {d.name}</Serif><Body>{[d.speed,d.glide,d.turn,d.fade].map(x => x ?? '?').join(' / ')}</Body>
      <Body size={10}>{d.attribution} · {d.data_version}</Body>
      <Pressable onPress={() => void add(d)}><Body color={C.clay}>Add to my bag</Body></Pressable>
    </View>)}
  </ScrollView></SafeAreaView>;
}
