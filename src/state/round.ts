import { create } from 'zustand';
import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { supabase } from '@/lib/supabase';

// Legacy AsyncStorage bf_rounds_v1 remains untouched for the C4 importer.
export type RoundHole = { hole: number; par: number | null; distFt: number | null; sourceLayoutHoleId: string | null };
export type PlayableCourse = { id: string; name: string; layout: string; layoutVersionId: string | null; dataVersion: string; holes: RoundHole[] };
export type LiveRound = {
  id: string; participantId: string; courseId: string; courseName: string; layout: string;
  layoutVersionId: string | null; dataVersion: string; startedAt: string;
  players: { id: string; name: string; initials: string }[]; pars: (number | null)[];
  holes: RoundHole[]; scores: Record<string, Record<number, number>>; cur: number;
  revision: number; syncError: string | null;
};
export type SavedRound = {
  id: string; participantId: string; courseId: string; courseName: string; layout: string;
  playedAt: string; holes: number; par: number | null; total: number; relPar: number | null;
  scores: Record<string, Record<number, number>>; players: LiveRound['players']; pars: (number | null)[];
};

const db = SQLite.openDatabaseSync('birdie_rounds_v2.db');
db.execSync(`PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS local_rounds (
  id TEXT PRIMARY KEY, owner_namespace TEXT NOT NULL, participant_id TEXT NOT NULL,
  course_id TEXT NOT NULL, course_name TEXT NOT NULL, layout_name TEXT NOT NULL,
  layout_version_id TEXT, data_version TEXT NOT NULL, started_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('live','complete','abandoned')),
  server_revision INTEGER NOT NULL DEFAULT 0, cur INTEGER NOT NULL DEFAULT 1,
  create_request TEXT NOT NULL, sync_error TEXT
);
CREATE TABLE IF NOT EXISTS local_holes (
  round_id TEXT NOT NULL REFERENCES local_rounds(id) ON DELETE CASCADE,
  hole_number INTEGER NOT NULL, par INTEGER, distance_ft INTEGER, source_layout_hole_id TEXT,
  PRIMARY KEY(round_id,hole_number)
);
CREATE TABLE IF NOT EXISTS local_scores (
  round_id TEXT NOT NULL REFERENCES local_rounds(id) ON DELETE CASCADE,
  hole_number INTEGER NOT NULL, strokes INTEGER NOT NULL CHECK(strokes BETWEEN 1 AND 12),
  PRIMARY KEY(round_id,hole_number)
);
CREATE TABLE IF NOT EXISTS outbox (
  seq INTEGER PRIMARY KEY AUTOINCREMENT, owner_namespace TEXT NOT NULL, round_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('create','score','complete')),
  mutation_id TEXT NOT NULL UNIQUE, request_json TEXT NOT NULL
);`);

type DbRound = {
  id: string; participant_id: string; course_id: string; course_name: string;
  layout_name: string; layout_version_id: string | null; data_version: string;
  started_at: string; status: string; server_revision: number; cur: number; sync_error: string | null;
};
type DbHole = { hole_number: number; par: number | null; distance_ft: number | null; source_layout_hole_id: string | null };
type DbScore = { hole_number: number; strokes: number };
let activeNamespace = 'anonymous';
let syncing = false;
let hydrationGeneration = 0;

function readRound(row: DbRound): LiveRound {
  const holes = db.getAllSync<DbHole>('SELECT * FROM local_holes WHERE round_id = ? ORDER BY hole_number', row.id)
    .map(h => ({ hole: h.hole_number, par: h.par, distFt: h.distance_ft, sourceLayoutHoleId: h.source_layout_hole_id }));
  const scores = Object.fromEntries(db.getAllSync<DbScore>('SELECT hole_number, strokes FROM local_scores WHERE round_id = ?', row.id)
    .map(s => [s.hole_number, s.strokes])) as Record<number, number>;
  return {
    id: row.id, participantId: row.participant_id, courseId: row.course_id,
    courseName: row.course_name, layout: row.layout_name, layoutVersionId: row.layout_version_id,
    dataVersion: row.data_version, startedAt: row.started_at,
    players: [{ id: row.participant_id, name: 'You', initials: 'YO' }],
    pars: holes.map(h => h.par), holes, scores: { [row.participant_id]: scores },
    cur: row.cur, revision: row.server_revision, syncError: row.sync_error,
  };
}
function toSaved(round: LiveRound): SavedRound {
  const total = Object.values(round.scores[round.participantId]).reduce((sum, n) => sum + n, 0);
  const par = round.pars.every(p => p !== null) ? round.pars.reduce<number>((sum, p) => sum + (p ?? 0), 0) : null;
  return { id: round.id, participantId: round.participantId, courseId: round.courseId,
    courseName: round.courseName, layout: round.layout, playedAt: round.startedAt,
    holes: round.holes.length, par, total, relPar: par === null ? null : total - par,
    scores: round.scores, players: round.players, pars: round.pars };
}
function loadNamespace() {
  const liveRow = db.getFirstSync<DbRound>(
    "SELECT * FROM local_rounds WHERE owner_namespace = ? AND status = 'live' ORDER BY started_at DESC LIMIT 1", activeNamespace);
  const completed = db.getAllSync<DbRound>(
    "SELECT * FROM local_rounds WHERE owner_namespace = ? AND status = 'complete' ORDER BY started_at DESC", activeNamespace);
  useRound.setState({ live: liveRow ? readRound(liveRow) : null, history: completed.map(row => toSaved(readRound(row))) });
}
function pendingRevision(roundId: string, serverRevision: number) {
  const n = db.getFirstSync<{ n: number }>(
    "SELECT count(*) AS n FROM outbox WHERE round_id = ? AND kind IN ('score','complete')", roundId)?.n ?? 0;
  return serverRevision + n;
}

type RoundState = {
  live: LiveRound | null; history: SavedRound[]; hydrated: boolean;
  hydrate: () => Promise<void>;
  startRound: (course: PlayableCourse) => void;
  setScore: (hole: number, strokes: number) => void;
  setHole: (hole: number) => void;
  finishRound: () => boolean;
  syncPending: () => Promise<void>;
  refresh: (roundId: string) => Promise<void>;
  refreshAll: () => Promise<void>;
  anonymousRoundCount: () => number;
  claimAnonymousRounds: () => Promise<number>;
};
export const useRound = create<RoundState>((set, get) => ({
  live: null, history: [], hydrated: false,
  hydrate: async () => {
    const generation = ++hydrationGeneration;
    set({ hydrated: false });
    const session = await supabase?.auth.getSession();
    if (generation !== hydrationGeneration) return;
    activeNamespace = session?.data.session?.user.id ?? 'anonymous';
    loadNamespace();
    set({ hydrated: true });
    void get().syncPending();
  },
  startRound: (course) => {
    if (!course.holes.length || course.holes.some((h, i) => h.hole !== i + 1)) throw new Error('Confirm a complete hole sequence first.');
    const roundId = Crypto.randomUUID();
    const participantId = Crypto.randomUUID();
    const createRequest = { round_id: roundId, participant_id: participantId, course_id: course.id,
      layout_version_id: course.layoutVersionId,
      custom_layout: course.layoutVersionId ? null : { name: course.layout,
        holes: course.holes.map(h => ({ hole_number: h.hole, par: h.par, distance_ft: h.distFt })) } };
    db.withTransactionSync(() => {
      db.runSync(`INSERT INTO local_rounds(id,owner_namespace,participant_id,course_id,course_name,layout_name,layout_version_id,data_version,started_at,status,create_request)
        VALUES(?,?,?,?,?,?,?,?,?,'live',?)`, roundId, activeNamespace, participantId, course.id, course.name,
        course.layout, course.layoutVersionId, course.dataVersion, new Date().toISOString(), JSON.stringify(createRequest));
      for (const h of course.holes) db.runSync(
        'INSERT INTO local_holes(round_id,hole_number,par,distance_ft,source_layout_hole_id) VALUES(?,?,?,?,?)',
        roundId, h.hole, h.par, h.distFt, h.sourceLayoutHoleId);
      db.runSync('INSERT INTO outbox(owner_namespace,round_id,kind,mutation_id,request_json) VALUES(?,?,?,?,?)',
        activeNamespace, roundId, 'create', roundId, JSON.stringify(createRequest));
    });
    loadNamespace();
    void get().syncPending();
  },
  setScore: (hole, strokes) => {
    const round = get().live;
    if (!round || !Number.isInteger(strokes) || strokes < 1 || strokes > 12 || hole < 1 || hole > round.holes.length) return;
    const request = { round_id: round.id, participant_id: round.participantId, hole_number: hole,
      mutation_id: Crypto.randomUUID(), expected_revision: pendingRevision(round.id, round.revision), strokes };
    db.withTransactionSync(() => {
      db.runSync('INSERT INTO local_scores(round_id,hole_number,strokes) VALUES(?,?,?) ON CONFLICT(round_id,hole_number) DO UPDATE SET strokes=excluded.strokes', round.id, hole, strokes);
      db.runSync('INSERT INTO outbox(owner_namespace,round_id,kind,mutation_id,request_json) VALUES(?,?,?,?,?)',
        activeNamespace, round.id, 'score', request.mutation_id, JSON.stringify(request));
    });
    loadNamespace();
    void get().syncPending();
  },
  setHole: (hole) => {
    const round = get().live;
    if (!round) return;
    const cur = Math.max(1, Math.min(round.holes.length, hole));
    db.runSync('UPDATE local_rounds SET cur = ? WHERE id = ? AND owner_namespace = ?', cur, round.id, activeNamespace);
    set({ live: { ...round, cur } });
  },
  finishRound: () => {
    const round = get().live;
    if (!round || round.holes.some(h => round.scores[round.participantId][h.hole] == null)) return false;
    const request = { round_id: round.id, mutation_id: Crypto.randomUUID(), expected_revision: pendingRevision(round.id, round.revision) };
    db.withTransactionSync(() => {
      db.runSync("UPDATE local_rounds SET status = 'complete' WHERE id = ? AND owner_namespace = ?", round.id, activeNamespace);
      db.runSync('INSERT INTO outbox(owner_namespace,round_id,kind,mutation_id,request_json) VALUES(?,?,?,?,?)',
        activeNamespace, round.id, 'complete', request.mutation_id, JSON.stringify(request));
    });
    loadNamespace();
    void get().syncPending();
    return true;
  },
  syncPending: async () => {
    if (syncing || !supabase || activeNamespace === 'anonymous') return;
    syncing = true;
    const namespace = activeNamespace;
    try {
      const session = await supabase.auth.getSession();
      if (session.data.session?.user.id !== namespace || namespace !== activeNamespace) return;
      while (true) {
        const item = db.getFirstSync<{ seq: number; round_id: string; kind: string; request_json: string }>(
          'SELECT seq,round_id,kind,request_json FROM outbox WHERE owner_namespace = ? ORDER BY seq LIMIT 1', namespace);
        if (!item) break;
        if (namespace !== activeNamespace) return;
        const rpc = item.kind === 'create' ? 'create_solo_round_v1' : item.kind === 'score' ? 'write_score_v1' : 'complete_round_v1';
        const { data, error } = await supabase.rpc(rpc, { p_request: JSON.parse(item.request_json) });
        if (namespace !== activeNamespace) return;
        if (error || data?.error) {
          const code = data?.error?.code ?? error?.message ?? 'OFFLINE';
          db.runSync('UPDATE local_rounds SET sync_error = ? WHERE id = ?', code, item.round_id);
          loadNamespace();
          break;
        }
        db.withTransactionSync(() => {
          db.runSync('UPDATE local_rounds SET server_revision = ?, sync_error = NULL WHERE id = ?', data.data.revision, item.round_id);
          db.runSync('DELETE FROM outbox WHERE seq = ?', item.seq);
        });
      }
      loadNamespace();
    } catch (error) {
      if (namespace !== activeNamespace) return;
      const message = error instanceof Error ? error.message : 'Connection unavailable';
      const first = db.getFirstSync<{ round_id: string }>('SELECT round_id FROM outbox WHERE owner_namespace = ? ORDER BY seq LIMIT 1', namespace);
      if (first) db.runSync('UPDATE local_rounds SET sync_error = ? WHERE id = ?', message, first.round_id);
      loadNamespace();
    } finally { syncing = false; }
  },
  refresh: async (roundId) => {
    if (!supabase || activeNamespace === 'anonymous') return;
    const namespace = activeNamespace;
    const session = await supabase.auth.getSession();
    if (session.data.session?.user.id !== namespace || namespace !== activeNamespace) return;
    if (db.getFirstSync<{ n: number }>('SELECT count(*) AS n FROM outbox WHERE round_id = ?', roundId)?.n) return;
    const { data: round, error } = await supabase.from('rounds').select('id,revision,status').eq('id', roundId).maybeSingle();
    if (error || !round || namespace !== activeNamespace) return;
    const [holeResult, scoreResult] = await Promise.all([
      supabase.from('round_hole_snapshots').select('id,hole_number').eq('round_id', roundId),
      supabase.from('hole_scores').select('snapshot_hole_id,strokes').eq('round_id', roundId),
    ]);
    if (holeResult.error || scoreResult.error || !holeResult.data?.length || !scoreResult.data) return;
    const latest = await supabase.from('rounds').select('revision,status').eq('id', roundId).single();
    if (latest.error || latest.data.revision !== round.revision || latest.data.status !== round.status) return;
    const byId = new Map(holeResult.data.map(h => [h.id, h.hole_number]));
    if (namespace !== activeNamespace || db.getFirstSync<{ n: number }>('SELECT count(*) AS n FROM outbox WHERE round_id = ?', roundId)?.n) return;
    db.withTransactionSync(() => {
      db.runSync('DELETE FROM local_scores WHERE round_id = ?', roundId);
      for (const score of scoreResult.data) {
        const hole = byId.get(score.snapshot_hole_id);
        if (hole != null) db.runSync('INSERT INTO local_scores(round_id,hole_number,strokes) VALUES(?,?,?)', roundId, hole, score.strokes);
      }
      db.runSync('UPDATE local_rounds SET server_revision = ?, status = ?, sync_error = NULL WHERE id = ? AND owner_namespace = ?', round.revision, round.status, roundId, activeNamespace);
    });
    loadNamespace();
  },
  refreshAll: async () => {
    await get().syncPending();
    const namespace = activeNamespace;
    if (supabase && namespace !== 'anonymous') {
      const session = await supabase.auth.getSession();
      if (session.data.session?.user.id !== namespace || namespace !== activeNamespace) return;
    }
    if (supabase && activeNamespace !== 'anonymous') {
      const { data: remote, error } = await supabase.from('rounds')
        .select('id,course_id,layout_version_id,layout_name,data_version,started_at,status,revision,create_request')
        .order('started_at', { ascending: false });
      if (!error) for (const round of remote ?? []) {
        if (namespace !== activeNamespace) return;
        if (db.getFirstSync('SELECT id FROM local_rounds WHERE id = ?', round.id)) continue;
        const [participant, holes, scores, course] = await Promise.all([
          supabase.from('round_participants').select('id').eq('round_id', round.id).eq('is_owner', true).single(),
          supabase.from('round_hole_snapshots').select('id,hole_number,par,distance_ft,source_layout_hole_id').eq('round_id', round.id).order('hole_number'),
          supabase.from('hole_scores').select('snapshot_hole_id,strokes').eq('round_id', round.id),
          supabase.from('courses').select('name').eq('id', round.course_id).single(),
        ]);
        if (namespace !== activeNamespace) return;
        if (participant.error || holes.error || scores.error || course.error) continue;
        const byId = new Map((holes.data ?? []).map(h => [h.id, h.hole_number]));
        db.withTransactionSync(() => {
          db.runSync(`INSERT INTO local_rounds(id,owner_namespace,participant_id,course_id,course_name,layout_name,layout_version_id,data_version,started_at,status,server_revision,create_request)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`, round.id, activeNamespace, participant.data.id,
            round.course_id, course.data.name, round.layout_name, round.layout_version_id,
            round.data_version, round.started_at, round.status, round.revision, JSON.stringify(round.create_request));
          for (const h of holes.data ?? []) db.runSync(
            'INSERT INTO local_holes(round_id,hole_number,par,distance_ft,source_layout_hole_id) VALUES(?,?,?,?,?)',
            round.id, h.hole_number, h.par, h.distance_ft, h.source_layout_hole_id);
          for (const score of scores.data ?? []) {
            const hole = byId.get(score.snapshot_hole_id);
            if (hole != null) db.runSync('INSERT INTO local_scores(round_id,hole_number,strokes) VALUES(?,?,?)', round.id, hole, score.strokes);
          }
        });
      }
    }
    const rows = db.getAllSync<{ id: string }>('SELECT id FROM local_rounds WHERE owner_namespace = ?', activeNamespace);
    for (const row of rows) await get().refresh(row.id);
  },
  anonymousRoundCount: () => db.getFirstSync<{ n: number }>(
    "SELECT count(*) AS n FROM local_rounds WHERE owner_namespace = 'anonymous'")?.n ?? 0,
  claimAnonymousRounds: async () => {
    if (!supabase) throw new Error('Sign in before claiming local rounds.');
    const session = await supabase.auth.getSession();
    const userId = session.data.session?.user.id;
    if (!userId || activeNamespace !== userId) throw new Error('Account changed. Sign in again.');
    const count = get().anonymousRoundCount();
    db.withTransactionSync(() => {
      db.runSync("UPDATE local_rounds SET owner_namespace = ? WHERE owner_namespace = 'anonymous'", userId);
      db.runSync("UPDATE outbox SET owner_namespace = ? WHERE owner_namespace = 'anonymous'", userId);
    });
    loadNamespace();
    void get().syncPending();
    return count;
  },
}));

export function playerTotals(scores: Record<number, number>, pars: (number | null)[]) {
  let total = 0; let parTotal = 0; let thru = 0; let known = true;
  pars.forEach((par, i) => { const strokes = scores[i + 1];
    if (strokes != null) { total += strokes; thru++; if (par == null) known = false; else parTotal += par; }
  });
  return { total, rel: known && thru > 0 ? total - parTotal : null, thru };
}
