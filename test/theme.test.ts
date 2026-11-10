import { describe, expect, it } from 'vitest';
import { THEME_TOKENS, themeVars } from '../src/theme';

describe('themeVars', () => {
  it('emits every token in every mode', () => {
    for (const mode of ['auto', 'light', 'dark'] as const) {
      for (const dark of [true, false]) {
        expect(Object.keys(themeVars(mode, undefined, dark)).sort()).toEqual(
          [...THEME_TOKENS].sort(),
        );
      }
    }
  });
  it('dark palette exact', () => {
    const v = themeVars('dark', undefined, false);
    expect(v['--hru-bg']).toBe('#111318');
    expect(v['--hru-card']).toBe('#1c1c1e');
    expect(v['--hru-border']).toBe('#2a2a2e');
    expect(v['--hru-tile']).toBe('#232326');
    expect(v['--hru-chip']).toBe('#26262a');
    expect(v['--hru-track']).toBe('#34343a');
    expect(v['--hru-text']).toBe('#e1e1e1');
    expect(v['--hru-muted']).toBe('#9b9b9f');
    expect(v['--hru-chip-text']).toBe('#c8c8cc');
    expect(v['--hru-cool-text']).toBe('#a9cdea');
    expect(v['--hru-warm-text']).toBe('#f6c095');
    expect(v['--hru-ok-text']).toBe('#8bd48f');
    expect(v['--hru-warn-text']).toBe('#ffd166');
    expect(v['--hru-bad-text']).toBe('#ff9a9d');
  });
  it('light palette exact', () => {
    const v = themeVars('light', undefined, true);
    expect(v['--hru-bg']).toBe('#eef0f3');
    expect(v['--hru-card']).toBe('#ffffff');
    expect(v['--hru-border']).toBe('#e0e2e6');
    expect(v['--hru-tile']).toBe('#f2f3f5');
    expect(v['--hru-chip']).toBe('#eceef1');
    expect(v['--hru-track']).toBe('#d9dbe0');
    expect(v['--hru-text']).toBe('#1c1c1e');
    expect(v['--hru-muted']).toBe('#5f6368');
    expect(v['--hru-chip-text']).toBe('#3c4043');
    expect(v['--hru-cool-text']).toBe('#1f6aa5');
    expect(v['--hru-warm-text']).toBe('#a64d12');
    expect(v['--hru-ok-text']).toBe('#2e7d32');
    expect(v['--hru-warn-text']).toBe('#8a5a00');
    expect(v['--hru-bad-text']).toBe('#c62828');
  });
  it('fixed semantic fills and tints are theme independent', () => {
    for (const v of [themeVars('dark', undefined, true), themeVars('light', undefined, false)]) {
      expect(v['--hru-cool']).toBe('#5aa9e6');
      expect(v['--hru-warm']).toBe('#f39a4b');
      expect(v['--hru-ok']).toBe('#43a047');
      expect(v['--hru-warn']).toBe('#ffb300');
      expect(v['--hru-bad']).toBe('#e5484d');
      expect(v['--hru-cool-tint']).toBe('rgba(90, 169, 230, 0.14)');
      expect(v['--hru-warm-tint']).toBe('rgba(243, 154, 75, 0.14)');
      expect(v['--hru-ok-tint']).toBe('rgba(67, 160, 71, 0.18)');
      expect(v['--hru-warn-tint']).toBe('rgba(255, 179, 0, 0.16)');
      expect(v['--hru-bad-tint']).toBe('rgba(229, 72, 77, 0.18)');
      expect(v['--hru-on-accent']).toBe('#0b1620');
    }
  });
  it('auto uses HA variables with fallbacks from HA dark mode', () => {
    const dark = themeVars('auto', undefined, true);
    expect(dark['--hru-text']).toBe('var(--primary-text-color, #e1e1e1)');
    expect(dark['--hru-muted']).toBe('var(--secondary-text-color, #9b9b9f)');
    expect(dark['--hru-card']).toBe(
      'var(--ha-card-background, var(--card-background-color, #1c1c1e))',
    );
    expect(dark['--hru-border']).toBe('var(--divider-color, #2a2a2e)');
    expect(dark['--hru-bg']).toBe('var(--primary-background-color, #111318)');
    expect(dark['--hru-tile']).toBe('color-mix(in srgb, var(--hru-card) 96%, var(--hru-text))');
    expect(dark['--hru-chip']).toBe('color-mix(in srgb, var(--hru-card) 94%, var(--hru-text))');
    expect(dark['--hru-track']).toBe('color-mix(in srgb, var(--hru-card) 88%, var(--hru-text))');
    expect(dark['--hru-chip-text']).toBe(
      'color-mix(in srgb, var(--hru-text) 80%, var(--hru-card))',
    );
    expect(dark['--hru-ok-text']).toBe('#8bd48f');
    const light = themeVars('auto', undefined, false);
    expect(light['--hru-text']).toBe('var(--primary-text-color, #1c1c1e)');
    expect(light['--hru-ok-text']).toBe('#2e7d32');
  });
  it('default accent follows HA primary colour', () => {
    const v = themeVars('dark', undefined, true);
    expect(v['--hru-accent']).toBe('var(--primary-color, #5aa9e6)');
    expect(v['--hru-accent-text']).toBe(
      'color-mix(in srgb, var(--primary-color, #5aa9e6) 55%, white)',
    );
    expect(v['--hru-accent-tint']).toBe(
      'color-mix(in srgb, var(--primary-color, #5aa9e6) 16%, transparent)',
    );
  });
  it('accent override', () => {
    const d = themeVars('dark', '#9575cd', true);
    expect(d['--hru-accent']).toBe('#9575cd');
    expect(d['--hru-accent-tint']).toBe('color-mix(in srgb, #9575cd 16%, transparent)');
    const l = themeVars('light', '#9575cd', false);
    expect(l['--hru-accent-text']).toBe('color-mix(in srgb, #9575cd 65%, black)');
    expect(l['--hru-accent-tint']).toBe('color-mix(in srgb, #9575cd 14%, transparent)');
  });
  it('blank accent falls back to default', () => {
    expect(themeVars('dark', '  ', true)['--hru-accent']).toBe('var(--primary-color, #5aa9e6)');
  });
});
