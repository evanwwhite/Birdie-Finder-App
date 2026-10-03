// Read-only parsers for the previous Zustand stores. Manifest identity includes
// storage index so identical-looking real rounds stay separate.
import * as Crypto from 'expo-crypto';
type LegacyRound = { id?: string; courseId?: string; layout?: string;
  playedAt?: string; startedAt?: string; pars?: Array<number | null>;
  players?: Array<{ id: string }>; scores?: Record<string, Record<string, number>> };
type LegacyDisc = { id?: string; name?: string; brand?: string };
export type LegacyCandidate = { index: number; recordId: string; sourceSha256: string;
  kind: 'app_round' | 'app_bag_disc'; sourceId: string; status: 'ready' | 'ambiguous' };

function decoded(raw: string): unknown {
  try { return JSON.parse(raw); } catch { return null; }
}
async function hash(value: string) { return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value); }
export async function manifestId(value: string) {
  const bytes = new Uint8Array((await hash(value)).slice(0, 32).match(/../g)!.map(n => parseInt(n, 16)));
  bytes[6] = (bytes[6] & 15) | 80; bytes[8] = (bytes[8] & 63) | 128;
  const h = [...bytes].map(n => n.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
async function candidate(kind: LegacyCandidate['kind'], deviceId: string, index: number,
  value: LegacyRound | LegacyDisc): Promise<LegacyCandidate> {
  const raw = JSON.stringify(value);
  return { index, kind, recordId: await manifestId(`${kind}:${deviceId}:${index}:${raw}`),
    sourceSha256: await hash(raw),
    sourceId: kind === 'app_round' ? (value as LegacyRound).courseId ?? '' : value.id ?? '',
    status: 'ambiguous' };
}
export async function previewAppRounds(raw: string, deviceId: string) {
  const store = decoded(raw) as { state?: { history?: LegacyRound[]; live?: LegacyRound } } | null;
  const rows = [...(Array.isArray(store?.state?.history) ? store.state.history : []),
    ...(store?.state?.live ? [store.state.live] : [])];
  const records: LegacyCandidate[] = [], invalid: number[] = [];
  for (const [index, row] of rows.entries()) {
    if (typeof row?.courseId !== 'string' || !row?.players?.length || !row?.scores ||
      !Array.isArray(row.pars)) { invalid.push(index); continue; }
    records.push(await candidate('app_round', deviceId, index, row));
  }
  return { records, invalid };
}
export async function previewAppBag(raw: string, deviceId: string) {
  const store = decoded(raw) as { state?: { discs?: LegacyDisc[] } } | null;
  const rows = Array.isArray(store?.state?.discs) ? store.state.discs : [];
  const records: LegacyCandidate[] = [], invalid: number[] = [];
  for (const [index, disc] of rows.entries()) {
    if (typeof disc?.id !== 'string' || typeof disc.name !== 'string') { invalid.push(index); continue; }
    records.push(await candidate('app_bag_disc', deviceId, index, disc));
  }
  return { records, invalid };
}

export function appRoundRows(raw: string): LegacyRound[] {
  const store = decoded(raw) as { state?: { history?: LegacyRound[]; live?: LegacyRound } } | null;
  return [...(Array.isArray(store?.state?.history) ? store.state.history : []),
    ...(store?.state?.live ? [store.state.live] : [])];
}
export function appBagRows(raw: string): LegacyDisc[] {
  const store = decoded(raw) as { state?: { discs?: LegacyDisc[] } } | null;
  return Array.isArray(store?.state?.discs) ? store.state.discs : [];
}
export async function validateCandidate(candidate: LegacyCandidate, value: LegacyRound | LegacyDisc) {
  if (await hash(JSON.stringify(value)) !== candidate.sourceSha256) throw new Error('Legacy store changed; refresh the preview.');
}
