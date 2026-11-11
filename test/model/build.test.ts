import { describe, expect, it, vi } from 'vitest';
import { buildModel } from '../../src/model/build';
import type { HassEntity, HomeAssistant, HruCardConfig } from '../../src/types';
import { makeHass, state } from '../helpers';

const CONFIG: HruCardConfig = {
  type: 'custom:hru-card',
  intake_temp: 'sensor.intake',
  supply_temp: 'sensor.supply',
  extract_temp: 'sensor.extract',
  exhaust_temp: 'sensor.exhaust',
  supply_fan: 'sensor.supply_fan',
  extract_fan: 'sensor.extract_fan',
  mode: 'select.mode',
  filter: 'sensor.filter',
  bypass: 'binary_sensor.bypass',
  heater: 'binary_sensor.heater',
  defrost: 'binary_sensor.defrost',
  power: 'sensor.power',
};

function sample(overrides: Record<string, string> = {}, extra: Partial<HomeAssistant> = {}) {
  const base: Record<string, [string, Record<string, unknown>]> = {
    'sensor.intake': ['4.0', { unit_of_measurement: '°C' }],
    'sensor.supply': ['19.5', { unit_of_measurement: '°C' }],
    'sensor.extract': ['22.0', { unit_of_measurement: '°C' }],
    'sensor.exhaust': ['6.5', { unit_of_measurement: '°C' }],
    'sensor.supply_fan': ['45', { unit_of_measurement: '%' }],
    'sensor.extract_fan': ['42', { unit_of_measurement: '%' }],
    'select.mode': ['Normal', {}],
    'sensor.filter': ['62', { unit_of_measurement: '%' }],
    'binary_sensor.bypass': ['off', {}],
    'binary_sensor.heater': ['off', {}],
    'binary_sensor.defrost': ['off', {}],
    'sensor.power': ['48', { unit_of_measurement: 'W' }],
  };
  const entities: HassEntity[] = Object.entries(base).map(([id, [v, a]]) =>
    state(id, overrides[id] ?? v, a),
  );
  return makeHass(entities, extra);
}

describe('buildModel', () => {
  it('builds sample', () => {
    const m = buildModel(sample(), CONFIG);
    expect(m.recovery).toEqual({ value: 86, approx: true, entity: null });
    expect(m.subtitle).toBe('Normal mode · ≈86% heat recovery');
    expect(m.running).toBe(true);
    expect(m.stopped).toBeNull();
    expect(m.motion.supply).toBeCloseTo(1.83);
    expect(m.motion.extract).toBeCloseTo(0.4 + 0.58 * 2.6);
    expect(m.motion.spin).toBe(2.4);
    expect(m.chips).toHaveLength(3);
    expect(m.hero.display).toBe('19.5°');
    expect(m.hero.sub).toEqual({ text: 'from 4.0° intake', entity: null });
    expect(m.name).toBe('Ventilation');
    expect(m.icon).toBe('mdi:fan');
    expect(m.mode).toEqual({ entity: 'select.mode', label: 'Normal' });
    expect(m.tempCount).toBe(4);
    expect(m.temps.supply).toEqual({
      key: 'supply',
      entity: 'sensor.supply',
      value: 19.5,
      display: '19.5°',
      label: 'Supply',
    });
    expect(m.fans.supply).toEqual({
      entity: 'sensor.supply_fan',
      level: 45,
      display: '45%',
      rpm: null,
    });
    expect(m.filter?.label).toBe('Filter 62%');
    expect(m.extras).toEqual([
      { key: 'power', entity: 'sensor.power', label: 'Power', display: '48 W' },
    ]);
  });

  it('standby stops everything', () => {
    const m = buildModel(sample({ 'select.mode': 'Standby' }), CONFIG);
    expect(m.running).toBe(false);
    expect(m.stopped).toEqual({ label: 'Standby', icon: 'mdi:power-sleep' });
    expect(m.motion).toEqual({ supply: null, extract: null, spin: null });
    expect(m.subtitle).toBe('Standby · fans stopped');
  });

  it('off mode shows unit off', () => {
    const m = buildModel(sample({ 'select.mode': 'off' }), CONFIG);
    expect(m.stopped).toEqual({ label: 'Unit off', icon: 'mdi:power' });
    expect(m.subtitle).toBe('Unit off · no airflow');
    expect(m.mode?.label).toBe('Off');
  });

  it('off by fans', () => {
    const m = buildModel(sample({ 'sensor.supply_fan': '0', 'sensor.extract_fan': '0' }), CONFIG);
    expect(m.running).toBe(false);
    expect(m.stopped?.label).toBe('Unit off');
    expect(m.motion.spin).toBeNull();
  });

  it('one fan stopped keeps running', () => {
    const m = buildModel(sample({ 'sensor.extract_fan': '0' }), CONFIG);
    expect(m.running).toBe(true);
    expect(m.motion.extract).toBeNull();
    expect(m.motion.supply).toBeCloseTo(1.83);
  });

  it('unknown mode uses fan level for spin', () => {
    const m = buildModel(
      sample({ 'select.mode': 'Quirky', 'sensor.supply_fan': '90', 'sensor.extract_fan': '90' }),
      CONFIG,
    );
    expect(m.motion.spin).toBe(0.6);
    expect(m.subtitle).toBe('Quirky mode · ≈86% heat recovery');
  });

  it('mode_speeds override applies', () => {
    const m = buildModel(sample({ 'select.mode': 'Quirky' }), {
      ...CONFIG,
      mode_speeds: { quirky: 'off' },
    });
    expect(m.running).toBe(false);
  });

  it('unmapped fan uses mode band', () => {
    const cfg = { ...CONFIG, extract_fan: undefined };
    const m = buildModel(sample({ 'select.mode': 'Boost' }), cfg);
    expect(m.motion.extract).toBe(0.4);
    expect(m.fans.extract).toBeUndefined();
  });

  it('no fans and no known mode: no motion but running', () => {
    const cfg = { ...CONFIG, supply_fan: undefined, extract_fan: undefined };
    const m = buildModel(sample({ 'select.mode': 'Quirky' }), cfg);
    expect(m.running).toBe(true);
    expect(m.motion).toEqual({ supply: null, extract: null, spin: null });
  });

  it('no mode mapped falls back to fans', () => {
    const cfg = { ...CONFIG, mode: undefined };
    const m = buildModel(sample(), cfg);
    expect(m.mode).toBeNull();
    expect(m.motion.spin).toBe(2.4);
    expect(m.subtitle).toBe('≈86% heat recovery');
  });

  it('subtitle fallback when nothing known', () => {
    const m = buildModel(sample(), {
      type: 'custom:hru-card',
      intake_temp: 'sensor.intake',
      exhaust_temp: 'sensor.exhaust',
    });
    expect(m.subtitle).toBe('Heat recovery active');
    expect(m.recovery).toBeNull();
  });

  it('reads mode from fan and climate preset_mode', () => {
    const hass = makeHass([
      state('fan.hru', 'on', { preset_mode: 'away', percentage: 30 }),
      state('climate.hru', 'heat', { preset_mode: 'boost' }),
      state('fan.nopreset', 'on', { percentage: 30 }),
    ]);
    expect(buildModel(hass, { type: 'x', mode: 'fan.hru' }).mode?.label).toBe('Away');
    expect(buildModel(hass, { type: 'x', mode: 'climate.hru' }).motion.spin).toBe(0.6);
    expect(buildModel(hass, { type: 'x', mode: 'fan.nopreset' }).mode).toBeNull();
  });

  it('title-cases mode labels', () => {
    const m = buildModel(sample({ 'select.mode': 'away_mode' }), CONFIG);
    expect(m.mode?.label).toBe('Away Mode');
  });

  it('buildModel tolerates missing entities', () => {
    const m = buildModel(makeHass([]), CONFIG);
    expect(m.temps.intake?.display).toBe('—');
    expect(m.recovery).toBeNull();
    expect(m.hero).toEqual({ label: null, display: '—', sub: null });
    expect(m.mode).toBeNull();
    expect(m.fans.supply?.display).toBe('—');
    expect(m.filter?.label).toBe('Filter —');
    expect(m.chips.every((c) => !c.active)).toBe(true);
    expect(m.extras[0]?.display).toBe('—');
  });

  it('hero stays on supply and shows — when supply is unmapped (no fallback)', () => {
    const cfg = { ...CONFIG, supply_temp: undefined };
    const m = buildModel(sample(), cfg);
    expect(m.hero).toEqual({ label: null, display: '—', sub: null });
    expect(m.tempCount).toBe(3);
  });

  it('hero shows — when supply is unavailable (no fallback)', () => {
    const m = buildModel(sample({ 'sensor.supply': 'unavailable' }), CONFIG);
    expect(m.hero).toEqual({ label: null, display: '—', sub: null });
  });

  it('hero without intake has no sub', () => {
    const m = buildModel(sample({ 'sensor.intake': 'unavailable' }), CONFIG);
    expect(m.hero.display).toBe('19.5°');
    expect(m.hero.sub).toBeNull();
  });

  it('efficiency sensor wins', () => {
    const hass = makeHass([...Object.values(sample().states), state('sensor.eff', '90.4')]);
    const m = buildModel(hass, { ...CONFIG, efficiency: 'sensor.eff' });
    expect(m.recovery).toEqual({ value: 90, approx: false, entity: 'sensor.eff' });
    expect(m.subtitle).toBe('Normal mode · 90% heat recovery');
  });

  it('unavailable efficiency sensor falls back to computed', () => {
    const hass = makeHass([...Object.values(sample().states), state('sensor.eff', 'unknown')]);
    const m = buildModel(hass, { ...CONFIG, efficiency: 'sensor.eff' });
    expect(m.recovery).toEqual({ value: 86, approx: true, entity: null });
  });

  it('computes recovery in °F', () => {
    const hass = makeHass([
      state('sensor.i', '39', { unit_of_measurement: '°F' }),
      state('sensor.s', '67', { unit_of_measurement: '°F' }),
      state('sensor.e', '72', { unit_of_measurement: '°F' }),
    ]);
    const m = buildModel(hass, {
      type: 'x',
      intake_temp: 'sensor.i',
      supply_temp: 'sensor.s',
      extract_temp: 'sensor.e',
    });
    expect(m.recovery).toEqual({ value: 85, approx: true, entity: null });
  });

  it('name from device via formatEntityName', () => {
    const formatEntityName = vi.fn(() => 'Ventilation unit');
    const m = buildModel(sample({}, { formatEntityName }), CONFIG);
    expect(m.name).toBe('Ventilation unit');
    expect(formatEntityName).toHaveBeenCalledWith(
      expect.objectContaining({ entity_id: 'select.mode' }),
      [{ type: 'device' }],
    );
  });

  it('name falls back when helper missing or empty', () => {
    expect(buildModel(sample(), CONFIG).name).toBe('Ventilation');
    const m = buildModel(sample({}, { formatEntityName: () => '' }), CONFIG);
    expect(m.name).toBe('Ventilation');
  });

  it('config name and icon win', () => {
    const formatEntityName = vi.fn(() => 'Device');
    const m = buildModel(sample({}, { formatEntityName }), {
      ...CONFIG,
      name: 'Attic HRU',
      icon: 'mdi:air-conditioner',
    });
    expect(m.name).toBe('Attic HRU');
    expect(m.icon).toBe('mdi:air-conditioner');
    expect(formatEntityName).not.toHaveBeenCalled();
  });

  it('chips only for mapped roles', () => {
    const hass = makeHass([state('binary_sensor.h', 'on')]);
    const m = buildModel(hass, { type: 'x', heater: 'binary_sensor.h' });
    expect(m.chips).toEqual([
      {
        kind: 'heater',
        entity: 'binary_sensor.h',
        active: true,
        icon: 'mdi:fire',
        label: 'Heater on',
      },
    ]);
  });

  it('chip icons and labels', () => {
    const m = buildModel(
      sample({
        'binary_sensor.bypass': 'on',
        'binary_sensor.heater': 'off',
        'binary_sensor.defrost': 'on',
      }),
      CONFIG,
    );
    expect(m.chips.map((c) => [c.kind, c.icon, c.label])).toEqual([
      ['bypass', 'mdi:debug-step-over', 'Bypass open'],
      ['heater', 'mdi:fire-off', 'Heater off'],
      ['defrost', 'mdi:snowflake-melt', 'Defrosting'],
    ]);
    const idle = buildModel(sample(), CONFIG);
    expect(idle.chips.map((c) => c.icon)).toEqual([
      'mdi:valve-closed',
      'mdi:fire-off',
      'mdi:snowflake',
    ]);
    expect(idle.chips.map((c) => c.label)).toEqual(['Bypass closed', 'Heater off', 'Defrost idle']);
  });

  it('extras in fixed order, mapped only', () => {
    const hass = makeHass([
      state('sensor.rp', '850', { unit_of_measurement: 'W' }),
      state('sensor.p', '48', { unit_of_measurement: 'W' }),
      state('sensor.h', '45', { unit_of_measurement: '%' }),
      state('sensor.c', '620', { unit_of_measurement: 'ppm' }),
      state('sensor.a', '180', { unit_of_measurement: 'm³/h' }),
    ]);
    const m = buildModel(hass, {
      type: 'x',
      airflow: 'sensor.a',
      co2: 'sensor.c',
      humidity: 'sensor.h',
      power: 'sensor.p',
      recovered_power: 'sensor.rp',
    });
    expect(m.extras.map((e) => [e.key, e.label, e.display])).toEqual([
      ['recovered_power', 'Recovered', '850 W'],
      ['power', 'Power', '48 W'],
      ['humidity', 'Humidity', '45 %'],
      ['co2', 'CO₂', '620 ppm'],
      ['airflow', 'Air flow', '180 m³/h'],
    ]);
  });

  it('rpm fans: level from max_rpm and rpm text', () => {
    const hass = makeHass([
      state('sensor.sf', '1500', { unit_of_measurement: 'rpm' }),
      state('sensor.ef', '1200', { unit_of_measurement: 'rpm' }),
    ]);
    const m = buildModel(hass, {
      type: 'x',
      supply_fan: 'sensor.sf',
      extract_fan: 'sensor.ef',
      max_rpm: 2000,
    });
    expect(m.fans.supply).toEqual({
      entity: 'sensor.sf',
      level: 75,
      display: '75%',
      rpm: '1500 rpm',
    });
    expect(m.fans.extract?.level).toBe(60);
  });

  describe('target temperature', () => {
    const withTarget = (id: string): HruCardConfig => ({ ...CONFIG, target_temp: id });

    it('is null when target_temp is not mapped', () => {
      expect(buildModel(sample(), CONFIG).target).toBeNull();
    });

    it('reads a sensor state', () => {
      const hass = sample();
      hass.states['sensor.target'] = state('sensor.target', '21.5', { unit_of_measurement: '°C' });
      const m = buildModel(hass, withTarget('sensor.target'));
      expect(m.target).toEqual({ entity: 'sensor.target', display: '21.5°' });
    });

    it('reads the setpoint attribute of a climate entity', () => {
      const hass = sample();
      hass.states['climate.hru'] = state('climate.hru', 'heat', { temperature: 21 });
      expect(buildModel(hass, withTarget('climate.hru')).target?.display).toBe('21.0°');
    });

    it('shows — when the climate entity has no setpoint', () => {
      const hass = sample();
      hass.states['climate.hru'] = state('climate.hru', 'heat', {});
      expect(buildModel(hass, withTarget('climate.hru')).target?.display).toBe('—');
    });

    it('shows — when the entity is unavailable or missing', () => {
      const hass = sample();
      hass.states['sensor.target'] = state('sensor.target', 'unavailable');
      expect(buildModel(hass, withTarget('sensor.target')).target).toEqual({
        entity: 'sensor.target',
        display: '—',
      });
      expect(buildModel(sample(), withTarget('sensor.missing')).target?.display).toBe('—');
    });

    it('replaces the "from intake" hero line', () => {
      const hass = sample();
      hass.states['sensor.target'] = state('sensor.target', '21.5');
      expect(buildModel(hass, withTarget('sensor.target')).hero.sub).toEqual({
        text: 'target 21.5°',
        entity: 'sensor.target',
      });
    });

    it('shows the target under the supply hero even when supply is unmapped', () => {
      const hass = sample();
      hass.states['sensor.target'] = state('sensor.target', '21.5');
      const cfg = { ...withTarget('sensor.target'), supply_temp: undefined };
      expect(buildModel(hass, cfg).hero).toEqual({
        label: null,
        display: '—',
        sub: { text: 'target 21.5°', entity: 'sensor.target' },
      });
    });
  });
});
