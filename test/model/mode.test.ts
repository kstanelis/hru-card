import { describe, expect, it } from 'vitest';
import {
  BAND_LEVEL,
  SPIN_SECONDS,
  bandFromLevel,
  flowDuration,
  modeBand,
} from '../../src/model/mode';

describe('constants', () => {
  it('BAND_LEVEL', () => {
    expect(BAND_LEVEL).toEqual({ off: 0, low: 25, medium: 50, high: 75, max: 100 });
  });
  it('SPIN_SECONDS', () => {
    expect(SPIN_SECONDS).toEqual({ low: 5, medium: 2.4, high: 1.2, max: 0.6 });
  });
});

describe('modeBand', () => {
  it('normalises names', () => {
    expect(modeBand('AWAY ')).toBe('low');
    expect(modeBand('Away_mode')).toBe('low');
    expect(modeBand('Fireplace')).toBe('high');
    expect(modeBand('Standby')).toBe('off');
    expect(modeBand('Boost')).toBe('max');
    expect(modeBand('weird')).toBeNull();
  });
  it('maps every default word', () => {
    for (const w of ['away', 'eco', 'holiday', 'vacation', 'low']) expect(modeBand(w)).toBe('low');
    for (const w of ['normal', 'home', 'auto', 'medium']) expect(modeBand(w)).toBe('medium');
    for (const w of ['intensive', 'high', 'kitchen', 'fireplace']) expect(modeBand(w)).toBe('high');
    for (const w of ['boost', 'max', 'party', 'override']) expect(modeBand(w)).toBe('max');
    for (const w of ['off', 'standby']) expect(modeBand(w)).toBe('off');
  });
  it('matches starts-with a known word followed by space', () => {
    expect(modeBand('away mode')).toBe('low');
    expect(modeBand('Boost-30-min')).toBe('max');
    expect(modeBand('awayish')).toBeNull();
  });
  it('null for null or empty', () => {
    expect(modeBand(null)).toBeNull();
    expect(modeBand('  ')).toBeNull();
  });
  it('overrides win', () => {
    expect(modeBand('Kitchen', { kitchen: 'max' })).toBe('max');
  });
  it('override keys are normalised and apply to starts-with and unknown names', () => {
    expect(modeBand('Kitchen hood', { KITCHEN: 'max' })).toBe('max');
    expect(modeBand('Quirky', { quirky: 'low' })).toBe('low');
    expect(modeBand('Night_Mode', { 'night mode': 'low' })).toBe('low');
  });
});

describe('bandFromLevel', () => {
  it('maps levels', () => {
    expect(bandFromLevel(0)).toBe('off');
    expect(bandFromLevel(-3)).toBe('off');
    expect(bandFromLevel(20)).toBe('low');
    expect(bandFromLevel(50)).toBe('medium');
    expect(bandFromLevel(70)).toBe('high');
    expect(bandFromLevel(95)).toBe('max');
  });
  it('boundaries', () => {
    expect(bandFromLevel(37.5)).toBe('medium');
    expect(bandFromLevel(62.5)).toBe('high');
    expect(bandFromLevel(87.5)).toBe('max');
  });
});

describe('flowDuration', () => {
  it('computes seconds per cycle', () => {
    expect(flowDuration(100)).toBe(0.4);
    expect(flowDuration(50)).toBeCloseTo(1.7);
  });
  it('null when stopped or unknown', () => {
    expect(flowDuration(0)).toBeNull();
    expect(flowDuration(null)).toBeNull();
  });
});
