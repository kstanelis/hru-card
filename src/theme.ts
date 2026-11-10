import type { ThemeMode } from './types';

type Surface = 'bg' | 'card' | 'border' | 'tile' | 'chip' | 'track' | 'text' | 'muted' | 'chipText';
type SemanticText = 'cool' | 'warm' | 'ok' | 'warn' | 'bad';

interface Palette {
  surface: Record<Surface, string>;
  text: Record<SemanticText, string>;
  accentMix: string;
  tintPct: number;
}

/** Spec §8.1 palette. */
const DARK: Palette = {
  surface: {
    bg: '#111318',
    card: '#1c1c1e',
    border: '#2a2a2e',
    tile: '#232326',
    chip: '#26262a',
    track: '#34343a',
    text: '#e1e1e1',
    muted: '#9b9b9f',
    chipText: '#c8c8cc',
  },
  text: { cool: '#a9cdea', warm: '#f6c095', ok: '#8bd48f', warn: '#ffd166', bad: '#ff9a9d' },
  accentMix: '55%, white',
  tintPct: 16,
};

const LIGHT: Palette = {
  surface: {
    bg: '#eef0f3',
    card: '#ffffff',
    border: '#e0e2e6',
    tile: '#f2f3f5',
    chip: '#eceef1',
    track: '#d9dbe0',
    text: '#1c1c1e',
    muted: '#5f6368',
    chipText: '#3c4043',
  },
  text: { cool: '#1f6aa5', warm: '#a64d12', ok: '#2e7d32', warn: '#8a5a00', bad: '#c62828' },
  accentMix: '65%, black',
  tintPct: 14,
};

const FIXED = {
  '--hru-cool': '#5aa9e6',
  '--hru-warm': '#f39a4b',
  '--hru-ok': '#43a047',
  '--hru-warn': '#ffb300',
  '--hru-bad': '#e5484d',
  '--hru-cool-tint': 'rgba(90, 169, 230, 0.14)',
  '--hru-warm-tint': 'rgba(243, 154, 75, 0.14)',
  '--hru-ok-tint': 'rgba(67, 160, 71, 0.18)',
  '--hru-warn-tint': 'rgba(255, 179, 0, 0.16)',
  '--hru-bad-tint': 'rgba(229, 72, 77, 0.18)',
  '--hru-on-accent': '#0b1620',
} as const;

export const THEME_TOKENS = [
  '--hru-bg',
  '--hru-card',
  '--hru-border',
  '--hru-tile',
  '--hru-chip',
  '--hru-track',
  '--hru-text',
  '--hru-muted',
  '--hru-chip-text',
  '--hru-accent',
  '--hru-accent-text',
  '--hru-accent-tint',
  '--hru-cool-text',
  '--hru-warm-text',
  '--hru-ok-text',
  '--hru-warn-text',
  '--hru-bad-text',
  ...Object.keys(FIXED),
] as const;

const DEFAULT_ACCENT = 'var(--primary-color, #5aa9e6)';
const mix = (a: string, pct: number, b: string): string =>
  `color-mix(in srgb, ${a} ${String(pct)}%, ${b})`;

function surfaces(mode: ThemeMode, p: Palette): Record<string, string> {
  const s = p.surface;
  if (mode !== 'auto') {
    return {
      '--hru-bg': s.bg,
      '--hru-card': s.card,
      '--hru-border': s.border,
      '--hru-tile': s.tile,
      '--hru-chip': s.chip,
      '--hru-track': s.track,
      '--hru-text': s.text,
      '--hru-muted': s.muted,
      '--hru-chip-text': s.chipText,
    };
  }
  const card = 'var(--hru-card)';
  const text = 'var(--hru-text)';
  return {
    '--hru-bg': `var(--primary-background-color, ${s.bg})`,
    '--hru-card': `var(--ha-card-background, var(--card-background-color, ${s.card}))`,
    '--hru-border': `var(--divider-color, ${s.border})`,
    '--hru-tile': mix(card, 96, text),
    '--hru-chip': mix(card, 94, text),
    '--hru-track': mix(card, 88, text),
    '--hru-text': `var(--primary-text-color, ${s.text})`,
    '--hru-muted': `var(--secondary-text-color, ${s.muted})`,
    '--hru-chip-text': mix(text, 80, card),
  };
}

/**
 * CSS custom properties for the card. `light`/`dark` force the spec palette; `auto` follows
 * the HA theme variables, picking fallbacks and semantic text colours by `hassDark`.
 */
export function themeVars(
  mode: ThemeMode,
  accent: string | undefined,
  hassDark: boolean,
): Record<string, string> {
  const dark = mode === 'dark' || (mode === 'auto' && hassDark);
  const p = dark ? DARK : LIGHT;
  const a = accent?.trim() ? accent.trim() : DEFAULT_ACCENT;
  return {
    ...surfaces(mode, p),
    '--hru-accent': a,
    '--hru-accent-text': `color-mix(in srgb, ${a} ${p.accentMix})`,
    '--hru-accent-tint': mix(a, p.tintPct, 'transparent'),
    '--hru-cool-text': p.text.cool,
    '--hru-warm-text': p.text.warm,
    '--hru-ok-text': p.text.ok,
    '--hru-warn-text': p.text.warn,
    '--hru-bad-text': p.text.bad,
    ...FIXED,
  };
}
