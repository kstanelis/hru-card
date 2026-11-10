import { describe, expect, it, vi } from 'vitest';
import { ROLE_DOMAINS } from '../src/config';
import {
  buildSchema,
  computeLabel,
  type HaFormField,
  type HaFormSchema,
} from '../src/editor-schema';
import { HruCardEditor } from '../src/editor';
import type { HomeAssistant } from '../src/types';

function flatten(schema: readonly HaFormSchema[]): HaFormField[] {
  return schema.flatMap((s) => ('schema' in s ? flatten(s.schema) : [s]));
}

const STYLE_KEYS = [
  'layout',
  'name',
  'icon',
  'theme',
  'accent',
  'animations',
  'max_rpm',
  'filter_limit',
  'filter_warning',
  'filter_critical',
];

describe('buildSchema', () => {
  it('schema covers every role key', () => {
    const names = flatten(buildSchema()).map((s) => s.name);
    for (const key of [...Object.keys(ROLE_DOMAINS), ...STYLE_KEYS]) expect(names).toContain(key);
    expect(new Set(names).size).toBe(names.length);
  });

  it('groups fields into flattened expandable sections in spec order', () => {
    const top = buildSchema();
    expect(top.map((s) => s.name)).toEqual([
      'appearance',
      'temperatures',
      'fans',
      'status',
      'extras',
    ]);
    for (const s of top) {
      expect(s).toMatchObject({ type: 'expandable', flatten: true });
    }
    expect(top[0]).toMatchObject({ expanded: true });
  });

  it('entity selectors use role domains', () => {
    const byName = new Map(flatten(buildSchema()).map((s) => [s.name, s]));
    expect(byName.get('supply_fan')?.selector).toEqual({
      entity: { filter: { domain: ['sensor', 'fan', 'number'] } },
    });
    for (const [role, domain] of Object.entries(ROLE_DOMAINS)) {
      expect(byName.get(role)?.selector).toEqual({ entity: { filter: { domain } } });
    }
  });

  it('layout select offers the three layouts with labels', () => {
    const layout = flatten(buildSchema()).find((s) => s.name === 'layout');
    expect(layout?.selector).toEqual({
      select: {
        mode: 'dropdown',
        options: [
          { value: 'flow', label: 'Flow diagram' },
          { value: 'lanes', label: 'Lanes + tiles' },
          { value: 'compact', label: 'Compact' },
        ],
      },
    });
  });

  it('style fields use fitting selectors', () => {
    const byName = new Map(flatten(buildSchema()).map((s) => [s.name, s]));
    expect(byName.get('icon')?.selector).toEqual({ icon: {} });
    expect(byName.get('animations')?.selector).toEqual({ boolean: {} });
    expect(byName.get('accent')?.selector).toEqual({ text: {} });
    expect(byName.get('max_rpm')?.selector).toMatchObject({ number: { min: 1, mode: 'box' } });
    expect(byName.get('filter_warning')?.selector).toMatchObject({
      number: { min: 0, max: 100, unit_of_measurement: '%' },
    });
  });
});

describe('computeLabel', () => {
  it('labels fields and sections from strings', () => {
    expect(computeLabel({ name: 'intake_temp' })).toBe('Intake temperature');
    expect(computeLabel({ name: 'max_rpm' })).toBe('Max fan speed (rpm)');
    expect(computeLabel({ name: 'appearance' })).toBe('Appearance');
  });

  it('falls back to the field name for unknown fields', () => {
    expect(computeLabel({ name: 'mode_speeds' })).toBe('mode_speeds');
  });

  it('every schema entry has a label', () => {
    const all = [...buildSchema(), ...flatten(buildSchema())];
    for (const s of all) expect(computeLabel(s)).not.toBe(s.name);
  });
});

describe('HruCardEditor', () => {
  async function mountEditor() {
    const el = document.createElement('hru-card-editor');
    el.setConfig({
      type: 'custom:hru-card',
      supply_temp: 'sensor.s',
      mode_speeds: { Boost: 'max' },
    });
    const hass = { states: {} } as unknown as HomeAssistant;
    el.hass = hass;
    document.body.append(el);
    await el.updateComplete;
    const changed = vi.fn<(e: CustomEvent<{ config: unknown }>) => void>();
    el.addEventListener('config-changed', (e) => {
      changed(e as CustomEvent<{ config: unknown }>);
    });
    return { el, changed };
  }

  it('renders ha-form with data and schema', async () => {
    const { el } = await mountEditor();
    const form = el.shadowRoot?.querySelector('ha-form') as
      (HTMLElement & { data: unknown; schema: unknown; computeLabel: unknown }) | null;
    expect(form?.data).toMatchObject({ supply_temp: 'sensor.s' });
    expect(form?.schema).toEqual(buildSchema());
    expect(form?.computeLabel).toBe(computeLabel);
    el.remove();
  });

  it('editor drops empty values', async () => {
    const { el, changed } = await mountEditor();
    el.shadowRoot?.querySelector('ha-form')?.dispatchEvent(
      new CustomEvent('value-changed', {
        detail: {
          value: {
            type: 'custom:hru-card',
            supply_temp: '',
            intake_temp: 'sensor.i',
            name: undefined,
            mode_speeds: { Boost: 'max' },
          },
        },
      }),
    );
    expect(changed).toHaveBeenCalledTimes(1);
    const event = changed.mock.calls[0]?.[0];
    expect(event.detail.config).toEqual({
      type: 'custom:hru-card',
      intake_temp: 'sensor.i',
      mode_speeds: { Boost: 'max' },
    });
    expect(event.bubbles).toBe(true);
    expect(event.composed).toBe(true);
    el.remove();
  });

  it('shows defaults in the form but does not write them back', async () => {
    const { el, changed } = await mountEditor();
    const form = el.shadowRoot?.querySelector('ha-form') as
      (HTMLElement & { data: unknown }) | null;
    expect(form?.data).toMatchObject({ animations: true, layout: 'flow', max_rpm: 3000 });
    form?.dispatchEvent(
      new CustomEvent('value-changed', {
        detail: {
          value: { type: 'custom:hru-card', animations: true, layout: 'lanes', max_rpm: 3000 },
        },
      }),
    );
    expect(changed.mock.calls[0]?.[0].detail.config).toEqual({
      type: 'custom:hru-card',
      layout: 'lanes',
    });
    el.remove();
  });

  it('renders nothing before hass and config', () => {
    const el = new HruCardEditor();
    document.body.append(el);
    expect(el.shadowRoot?.querySelector('ha-form') ?? null).toBeNull();
    el.remove();
  });
});
