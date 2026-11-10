import { describe, expect, it } from 'vitest';
import { computeEfficiency } from '../../src/model/efficiency';

describe('computeEfficiency', () => {
  it('efficiency example', () => {
    expect(computeEfficiency(4, 19.5, 22)).toBe(86);
  });
  it('efficiency clamps', () => {
    expect(computeEfficiency(4, 30, 22)).toBe(100);
    expect(computeEfficiency(4, 2, 22)).toBe(0);
  });
  it('efficiency null on missing input', () => {
    expect(computeEfficiency(null, 19.5, 22)).toBeNull();
    expect(computeEfficiency(4, null, 22)).toBeNull();
    expect(computeEfficiency(4, 19.5, null)).toBeNull();
  });
  it('efficiency guard respects °F', () => {
    expect(computeEfficiency(68, 69, 69.5, '°F')).toBeNull();
    expect(computeEfficiency(39, 67, 72, '°F')).toBe(85);
    expect(computeEfficiency(20, 20.5, 20.8)).toBeNull();
  });
  it('works in summer (extract cooler than intake)', () => {
    expect(computeEfficiency(30, 24, 22)).toBe(75);
  });
});
