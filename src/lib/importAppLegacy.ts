import { supabase } from './supabase';
import { appBagRows, appRoundRows, manifestId, validateCandidate, type LegacyCandidate } from './legacyImport';

async function account() {
  if (!supabase) throw new Error('Connect and sign in before importing.');
  const user = await supabase.auth.getUser();
  if (user.error || !user.data.user) throw new Error('Sign in before importing.');
  return user.data.user.id;
}
async function rpc(name: string, request: object) {
  const result = await supabase!.rpc(name,{p_request:request});
  if (result.error || result.data?.error) throw new Error(result.error?.message ?? result.data.error.message);
  return result.data.data;
}
async function receipt(candidate: LegacyCandidate, deviceId: string, targetId: string, playedAt?: string) {
  const date = playedAt && !Number.isNaN(Date.parse(playedAt)) ? new Date(playedAt).toISOString() : null;
  const result = await supabase!.rpc('ack_legacy_import_v1',{
    p_device_id:deviceId,p_record_id:candidate.recordId,p_record_kind:candidate.kind,
    p_source_sha256:candidate.sourceSha256,p_target_id:targetId,p_played_at:date });
  if (result.error) throw result.error;
  return result.data;
}
export async function importAppBagDisc(candidate: LegacyCandidate, rawStore: string, deviceId: string) {
  if (candidate.kind !== 'app_bag_disc') throw new Error('Wrong import kind.');
  const ownerId = await account(), row = appBagRows(rawStore)[candidate.index];
  if (!row) throw new Error('Legacy bag record changed.');
  await validateCandidate(candidate,row);
  const crosswalk = await supabase!.from('disc_external_ids').select('disc_mold_id')
    .eq('provider','legacy_app').eq('external_id',row.id!).maybeSingle();
  if (crosswalk.error || !crosswalk.data) throw new Error('Disc mold match needs review. Export this record for later.');
  const saved = await supabase!.from('bag_items').upsert({id:candidate.recordId,owner_id:ownerId,
    disc_mold_id:crosswalk.data.disc_mold_id},{onConflict:'id'}).select('id').single();
  if (saved.error || !saved.data) throw new Error(saved.error?.message ?? 'Bag item not saved.');
  return receipt(candidate,deviceId,saved.data.id);
}

export async function importAppRound(candidate: LegacyCandidate, rawStore: string, deviceId: string) {
  if (candidate.kind !== 'app_round') throw new Error('Wrong import kind.');
  await account();
  const row = appRoundRows(rawStore)[candidate.index];
  if (!row) throw new Error('Legacy round changed.');
  await validateCandidate(candidate,row);
  if (!row.courseId || !row.players || row.players.length !== 1 || !Array.isArray(row.pars) ||
      !row.pars.length || row.pars.length > 36) {
    throw new Error('Legacy round needs manual review. Export it for later.');
  }
  const values = row.scores?.[row.players[0].id] ?? {};
  if (Object.entries(values).some(([hole,strokes]) => !Number.isInteger(+hole) || +hole < 1 ||
      +hole > row.pars!.length || !Number.isInteger(strokes) || strokes < 1 || strokes > 12)) {
    throw new Error('Legacy strokes need manual review.');
  }
  const crosswalk = await supabase!.from('course_external_ids').select('course_id')
    .eq('provider','legacy_app').eq('external_id',row.courseId).maybeSingle();
  if (crosswalk.error || !crosswalk.data) throw new Error('Course match needs review. Export this round for later.');
  if (!__DEV__) {
    const approved = await supabase!.from('courses').select('id').eq('id',crosswalk.data.course_id)
      .eq('published',true).eq('synthetic',false).maybeSingle();
    if (approved.error || !approved.data) throw new Error('Course is not approved for public use.');
  }
  const participantId = await manifestId(`participant:${candidate.recordId}`);
  await rpc('create_solo_round_v1',{round_id:candidate.recordId,participant_id:participantId,
    course_id:crosswalk.data.course_id,layout_version_id:null,
    custom_layout:{name:row.layout || 'Imported legacy round',
      holes:row.pars.map((_,i) => ({hole_number:i+1,par:null,distance_ft:null}))}});
  for (let hole=1;hole<=row.pars.length;hole++) {
    const strokes = values[String(hole)];
    if (strokes == null) continue;
    const current = await supabase!.from('rounds').select('revision').eq('id',candidate.recordId).single();
    const snapshots = await supabase!.from('round_hole_snapshots').select('id')
      .eq('round_id',candidate.recordId).eq('hole_number',hole).single();
    if (current.error || snapshots.error) throw new Error('Imported round cannot be read back.');
    const old = await supabase!.from('hole_scores').select('strokes').eq('round_id',candidate.recordId)
      .eq('snapshot_hole_id',snapshots.data.id).maybeSingle();
    if (old.data?.strokes === strokes) continue;
    await rpc('write_score_v1',{round_id:candidate.recordId,participant_id:participantId,hole_number:hole,
      strokes,mutation_id:await manifestId(`legacy-score:${candidate.recordId}:${hole}`),
      expected_revision:current.data.revision});
  }
  const complete = !!row.playedAt && row.pars.every((_,i) => values[String(i+1)] != null);
  if (complete) {
    const current = await supabase!.from('rounds').select('revision,status').eq('id',candidate.recordId).single();
    if (!current.error && current.data.status === 'live') await rpc('complete_round_v1',{
      round_id:candidate.recordId,mutation_id:await manifestId(`legacy-complete:${candidate.recordId}`),
      expected_revision:current.data.revision});
  }
  const saved = await supabase!.from('rounds').select('id').eq('id',candidate.recordId).single();
  if (saved.error) throw new Error('Imported round is not visible from this account.');
  return receipt(candidate,deviceId,candidate.recordId,row.playedAt ?? row.startedAt);
}
