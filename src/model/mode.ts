import type { SpeedBand } from '../types';

export const BAND_LEVEL: Record<SpeedBand, number> = {
  off: 0,
  low: 25,
  medium: 50,
  high: 75,
  max: 100,
};

export const SPIN_SECONDS: Record<Exclude<SpeedBand, 'off'>, number> = {
  low: 5,
  medium: 2.4,
  high: 1.2,
  max: 0.6,
};

const DEFAULT_WORDS: Record<SpeedBand, string[]> = {
  low: ['away', 'eco', 'holiday', 'vacation', 'low'],
  medium: ['normal', 'home', 'auto', 'medium'],
  high: ['intensive', 'high', 'kitchen', 'fireplace'],
  max: ['boost', 'max', 'party', 'override'],
  off: ['off', 'standby'],
};

const DEFAULTS = new Map<string, SpeedBand>(
  (Object.entries(DEFAULT_WORDS) as [SpeedBand, string[]][]).flatMap(([band, words]) =>
    words.map((w): [string, SpeedBand] => [w, band]),
  ),
);

export function normaliseMode(name: string): string {
  return name.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
}

function lookup(name: string, table: Map<string, SpeedBand>): SpeedBand | null {
  const exact = table.get(name);
  if (exact) return exact;
  for (const [word, band] of table) {
    if (name.startsWith(`${word} `)) return band;
  }
  return null;
}

/** Speed band for a mode name; user overrides first, then built-in words. */
export function modeBand(
  mode: string | null,
  overrides?: Record<string, SpeedBand>,
): SpeedBand | null {
  if (mode === null) return null;
  const name = normaliseMode(mode);
  if (!name) return null;
  if (overrides) {
    const table = new Map(
      Object.entries(overrides).map(([k, v]): [string, SpeedBand] => [normaliseMode(k), v]),
    );
    const hit = lookup(name, table);
    if (hit) return hit;
  }
  return lookup(name, DEFAULTS);
}

export function bandFromLevel(level: number): SpeedBand {
  if (level <= 0) return 'off';
  if (level < 37.5) return 'low';
  if (level < 62.5) return 'medium';
  if (level < 87.5) return 'high';
  return 'max';
}

/** Seconds per flow-animation cycle; null = paused. */
export function flowDuration(level: number | null): number | null {
  if (level === null || level <= 0) return null;
  return 0.4 + ((100 - level) / 100) * 2.6;
}
