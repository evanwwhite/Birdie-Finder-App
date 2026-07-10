// Design tokens — source of truth: README.md §Design System (matches assets/styles.css in the web repo)
export const C = {
  paper: '#f5f0e6',
  paper2: '#e7e2d5',
  forest: '#1e3a2b',
  forest2: '#2f5c3f',
  moss: '#6b8c5a',
  clay: '#c2703d',
  clayHover: '#ad6233',
  clayDeep: '#a8542a',
  text: '#2a2318',
  textStrong: '#20180f',
  muted: '#8a8072',
  muted2: '#6b6152',
  muted3: '#7a7061',
  gold: '#a08a5f',
  birdieBg: '#e8efdf',
  birdieFg: '#3f7a4e',
  bogeyBg: '#f6e7db',
  bogeyFg: '#c2703d',
  doubleBg: '#efc9b4',
  doubleFg: '#a8542a',
  tintGreen: '#eef1e8',
  tile: '#eae3d3',
  tile2: '#f6f2e8',
  tile3: '#faf7ef',
  card: '#ffffff',
  warnFg: '#8a6d3b',
  warnBg: '#f6ead8',
  border: 'rgba(30,58,43,0.10)',
  borderLight: 'rgba(30,58,43,0.07)',
  borderHeavy: 'rgba(30,58,43,0.14)',
} as const;

export const F = {
  serif: 'Spectral_700Bold',
  serif600: 'Spectral_600SemiBold',
  serif800: 'Spectral_800ExtraBold',
  sans: 'Archivo_400Regular',
  sansMed: 'Archivo_500Medium',
  sansSemi: 'Archivo_600SemiBold',
  sansBold: 'Archivo_700Bold',
  sansX: 'Archivo_800ExtraBold',
  mono: 'IBMPlexMono_400Regular',
  monoMed: 'IBMPlexMono_500Medium',
  monoSemi: 'IBMPlexMono_600SemiBold',
} as const;

export const R = { card: 16, cardLg: 20, hole: 24, pill: 12, chip: 7, full: 999 } as const;
export const GUTTER = 16;

export const shadow = {
  card: { shadowColor: '#1e190f', shadowOpacity: 0.06, shadowRadius: 30, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  sheet: { shadowColor: '#1e190f', shadowOpacity: 0.2, shadowRadius: 42, shadowOffset: { width: 0, height: -12 }, elevation: 12 },
  float: { shadowColor: '#1e190f', shadowOpacity: 0.14, shadowRadius: 26, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
} as const;

// Score visual language: birdie=green circle, +1=clay square, >=+2=deep-clay square, par=plain
export function scoreStyle(strokes: number, par: number) {
  const d = strokes - par;
  if (d < 0) return { bg: C.birdieBg, fg: C.birdieFg, circle: true };
  if (d === 1) return { bg: C.bogeyBg, fg: C.bogeyFg, circle: false };
  if (d >= 2) return { bg: C.doubleBg, fg: C.doubleFg, circle: false };
  return null;
}

export function relParLabel(rel: number) {
  return rel === 0 ? 'E' : rel > 0 ? `+${rel}` : `${rel}`;
}
