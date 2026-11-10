import { afterEach, describe, expect, it, vi } from 'vitest';
import '../src/hru-card';
import { MotionController } from '../src/motion';
import type { HruCard } from '../src/hru-card';
import type { HassEntity, HomeAssistant, HruCardConfig } from '../src/types';
import { makeHass, state } from './helpers';

const CONFIG: HruCardConfig = {
  type: 'custom:hru-card',
  intake_temp: 'sensor.intake',
  supply_temp: 'sensor.supply',
  extract_temp: 'sensor.extract',
};

const ENTITIES: HassEntity[] = [
  state('sensor.intake', '4.0', { unit_of_measurement: '°C' }),
  state('sensor.supply', '19.5', { unit_of_measurement: '°C' }),
  state('sensor.extract', '22.0', { unit_of_measurement: '°C' }),
  state('light.kitchen', 'off'),
];

async function mount(config: HruCardConfig = CONFIG, hass: HomeAssistant = makeHass(ENTITIES)) {
  const el = document.createElement('hru-card');
  el.setConfig(config);
  el.hass = hass;
  document.body.append(el);
  await el.updateComplete;
  return el;
}

interface Internals {
  shouldUpdate(changed: Map<PropertyKey, unknown>): boolean;
  moreInfo(entityId: string): void;
}
const internals = (el: HruCard): Internals => el as unknown as Internals;

const shadowText = (el: HruCard): string => el.shadowRoot?.textContent ?? '';

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('hru-card element', () => {
  it('setConfig throws on invalid layout', () => {
    const el = document.createElement('hru-card');
    expect(() => {
      el.setConfig({ ...CONFIG, layout: 'grid' as never });
    }).toThrow('layout: expected one of flow, lanes, compact, got grid');
  });

  it('setConfig warns once per warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const el = document.createElement('hru-card');
    const cfg = { ...CONFIG, outdoor: 'x' } as HruCardConfig;
    el.setConfig(cfg);
    el.setConfig(cfg);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith('hru-card: outdoor: unknown option');
  });

  it('renders nothing before hass is set', async () => {
    const el = document.createElement('hru-card');
    el.setConfig(CONFIG);
    document.body.append(el);
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('ha-card')).toBeNull();
  });

  it('renders ha-card with theme variables', async () => {
    const el = await mount({ ...CONFIG, theme: 'dark', accent: '#9575cd' });
    const card = el.shadowRoot?.querySelector('ha-card');
    expect(card).not.toBeNull();
    expect(card?.style.getPropertyValue('--hru-card')).toBe('#1c1c1e');
    expect(card?.style.getPropertyValue('--hru-accent')).toBe('#9575cd');
    expect(card?.classList.contains('no-motion')).toBe(false);
  });

  it('auto theme follows hass dark mode', async () => {
    const el = await mount(CONFIG, makeHass(ENTITIES, { themes: { darkMode: true } }));
    const card = el.shadowRoot?.querySelector('ha-card');
    expect(card?.style.getPropertyValue('--hru-text')).toBe('var(--primary-text-color, #e1e1e1)');
  });

  it('adds no-motion class when animations disabled', async () => {
    const el = await mount({ ...CONFIG, animations: false });
    expect(el.shadowRoot?.querySelector('ha-card')?.classList.contains('no-motion')).toBe(true);
  });

  it('renders hint with fewer than two temps', async () => {
    const el = await mount({ type: 'custom:hru-card', supply_temp: 'sensor.supply' });
    expect(shadowText(el)).toContain('Map at least two temperatures');
  });

  it('does not render hint with two temps', async () => {
    const el = await mount();
    expect(shadowText(el)).not.toContain('Map at least two temperatures');
  });

  it('shouldUpdate ignores unrelated entities', async () => {
    const hass = makeHass(ENTITIES);
    const el = await mount(CONFIG, hass);
    const unrelated: HomeAssistant = {
      ...hass,
      states: { ...hass.states, 'light.kitchen': state('light.kitchen', 'on') },
    };
    const changed = new Map<PropertyKey, unknown>([['hass', hass]]);
    el.hass = unrelated;
    expect(internals(el).shouldUpdate(changed)).toBe(false);
    const related: HomeAssistant = {
      ...unrelated,
      states: { ...unrelated.states, 'sensor.supply': state('sensor.supply', '20.0') },
    };
    el.hass = related;
    expect(internals(el).shouldUpdate(new Map([['hass', unrelated]]))).toBe(true);
  });

  it('shouldUpdate reacts to config, first hass and dark mode', async () => {
    const hass = makeHass(ENTITIES);
    const el = await mount(CONFIG, hass);
    expect(internals(el).shouldUpdate(new Map([['config', CONFIG]]))).toBe(true);
    expect(internals(el).shouldUpdate(new Map([['hass', undefined]]))).toBe(true);
    el.hass = { ...hass, themes: { darkMode: true } };
    expect(internals(el).shouldUpdate(new Map([['hass', hass]]))).toBe(true);
  });

  it('renders the flow layout', async () => {
    const el = await mount();
    expect(el.shadowRoot?.querySelector('ha-card .diagram')).not.toBeNull();
    expect(el.shadowRoot?.querySelector('ha-card .header')).not.toBeNull();
  });

  it('syncs motion with the model after each render', async () => {
    const sync = vi.spyOn(MotionController.prototype, 'sync').mockImplementation(() => undefined);
    const el = await mount();
    const [root, motion, enabled] = sync.mock.calls[0] ?? [];
    expect(root).toBe(el.shadowRoot);
    expect(motion).toEqual({ supply: null, extract: null, spin: null });
    expect(enabled).toBe(true);
  });

  it('syncs motion disabled when animations are off', async () => {
    const sync = vi.spyOn(MotionController.prototype, 'sync').mockImplementation(() => undefined);
    await mount({ ...CONFIG, animations: false });
    expect(sync).toHaveBeenLastCalledWith(expect.anything(), expect.anything(), false);
  });

  it('getCardSize per layout', async () => {
    expect((await mount()).getCardSize()).toBe(6);
    expect((await mount({ ...CONFIG, layout: 'lanes' })).getCardSize()).toBe(7);
    expect((await mount({ ...CONFIG, layout: 'compact' })).getCardSize()).toBe(4);
  });

  it('getGridOptions per layout', async () => {
    expect((await mount({ ...CONFIG, layout: 'compact' })).getGridOptions()).toEqual({
      columns: 6,
      min_columns: 6,
    });
    expect((await mount()).getGridOptions()).toEqual({ columns: 12, min_columns: 9 });
  });

  it('getLayoutOptions per layout', async () => {
    expect((await mount({ ...CONFIG, layout: 'compact' })).getLayoutOptions()).toEqual({
      grid_columns: 2,
      grid_min_columns: 2,
    });
    expect((await mount({ ...CONFIG, layout: 'lanes' })).getLayoutOptions()).toEqual({
      grid_columns: 4,
      grid_min_columns: 3,
    });
  });

  it('moreInfo fires hass-more-info', async () => {
    const el = await mount();
    const handler = vi.fn();
    document.body.addEventListener('hass-more-info', handler);
    internals(el).moreInfo('sensor.supply');
    expect(handler).toHaveBeenCalledTimes(1);
    const ev = handler.mock.calls[0]?.[0] as CustomEvent<{ entityId: string }>;
    expect(ev.detail.entityId).toBe('sensor.supply');
    expect(ev.bubbles).toBe(true);
    expect(ev.composed).toBe(true);
    document.body.removeEventListener('hass-more-info', handler);
  });

  it('registers in customCards once', () => {
    const entries = (window.customCards ?? []).filter((c) => c.type === 'hru-card');
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      type: 'hru-card',
      name: 'HRU Card',
      description: 'Heat recovery ventilation card',
      preview: true,
    });
    expect(typeof entries[0]?.getEntitySuggestion).toBe('function');
  });

  it('getConfigElement creates the editor element', () => {
    const Ctor = customElements.get('hru-card') as unknown as typeof HruCard;
    expect(Ctor.getConfigElement().tagName.toLowerCase()).toBe('hru-card-editor');
  });
});

const HRU_DEVICE: HassEntity[] = [
  state('sensor.hru_outdoor_temperature', '4', { unit_of_measurement: '°C' }),
  state('sensor.hru_supply_temperature', '19', { unit_of_measurement: '°C' }),
  state('sensor.hru_extract_temperature', '22', { unit_of_measurement: '°C' }),
  state('sensor.hru_exhaust_temperature', '6', { unit_of_measurement: '°C' }),
  state('sensor.hru_supply_fan', '45', { unit_of_measurement: '%' }),
  state('sensor.hru_extract_fan_speed', '1200', { unit_of_measurement: 'rpm' }),
  state('select.hru_operation_mode', 'Normal'),
  state('sensor.hru_supply_air_flow', '180', { unit_of_measurement: 'm³/h' }),
];

function registry(ids: string[], device: string | null) {
  return Object.fromEntries(ids.map((id) => [id, { entity_id: id, device_id: device }]));
}

describe('suggestions and stub config', () => {
  const Ctor = () => customElements.get('hru-card') as unknown as typeof HruCard;
  const suggest = () => {
    const entry = (window.customCards ?? []).find((c) => c.type === 'hru-card');
    if (!entry?.getEntitySuggestion) throw new Error('missing getEntitySuggestion');
    return entry.getEntitySuggestion;
  };

  it('getEntitySuggestion returns config for HRU device', () => {
    const hass = makeHass([...HRU_DEVICE, state('sensor.living_temperature', '21')], {
      entities: {
        ...registry(
          HRU_DEVICE.map((e) => e.entity_id),
          'dev1',
        ),
        ...registry(['sensor.living_temperature'], 'dev2'),
      },
    });
    expect(suggest()(hass, 'sensor.hru_supply_temperature')).toEqual({
      label: 'HRU Card',
      config: {
        type: 'custom:hru-card',
        intake_temp: 'sensor.hru_outdoor_temperature',
        supply_temp: 'sensor.hru_supply_temperature',
        extract_temp: 'sensor.hru_extract_temperature',
        exhaust_temp: 'sensor.hru_exhaust_temperature',
        supply_fan: 'sensor.hru_supply_fan',
        extract_fan: 'sensor.hru_extract_fan_speed',
        mode: 'select.hru_operation_mode',
      },
    });
  });

  it('returns null for lone sensor', () => {
    const hass = makeHass(HRU_DEVICE.slice(1, 2), {
      entities: registry(['sensor.hru_supply_temperature'], 'dev1'),
    });
    expect(suggest()(hass, 'sensor.hru_supply_temperature')).toBeNull();
  });

  it('returns null for entity without device or registry', () => {
    const ids = HRU_DEVICE.map((e) => e.entity_id);
    expect(
      suggest()(makeHass(HRU_DEVICE, { entities: registry(ids, null) }), ids[0] ?? ''),
    ).toBeNull();
    expect(suggest()(makeHass(HRU_DEVICE), ids[0] ?? '')).toBeNull();
  });

  it('never matches by vendor name', () => {
    const vendor = [
      state('sensor.komfovent_t1', '4', { unit_of_measurement: '°C' }),
      state('sensor.komfovent_t2', '19', { unit_of_measurement: '°C' }),
      state('sensor.komfovent_t3', '22', { unit_of_measurement: '°C' }),
    ];
    const hass = makeHass(vendor, {
      entities: registry(
        vendor.map((e) => e.entity_id),
        'dev1',
      ),
    });
    expect(suggest()(hass, 'sensor.komfovent_t1')).toBeNull();
  });

  it('matches by friendly name and fan domain', () => {
    const ents = [
      state('sensor.t1', '4', {
        unit_of_measurement: '°C',
        friendly_name: 'Fresh air temperature',
      }),
      state('sensor.t2', '19', { unit_of_measurement: '°F', friendly_name: 'Supply air' }),
      state('sensor.t3', '22', { device_class: 'temperature', friendly_name: 'Return air' }),
      state('fan.supply', 'on', { percentage: 40 }),
      state('input_select.ventilation_mode', 'Away'),
    ];
    const hass = makeHass(ents);
    expect(Ctor().getStubConfig(hass)).toEqual({
      type: 'custom:hru-card',
      layout: 'flow',
      intake_temp: 'sensor.t1',
      supply_temp: 'sensor.t2',
      extract_temp: 'sensor.t3',
      supply_fan: 'fan.supply',
      mode: 'input_select.ventilation_mode',
    });
  });

  it('getStubConfig ignores non-temperature sensors for temp roles', () => {
    const hass = makeHass([
      state('sensor.supply_humidity', '40', { unit_of_measurement: '%' }),
      state('sensor.supply_fan_power', '20', { unit_of_measurement: 'W' }),
      state('switch.supply_fan', 'on'),
    ]);
    expect(Ctor().getStubConfig(hass)).toEqual({ type: 'custom:hru-card', layout: 'flow' });
  });
});
