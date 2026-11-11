import { describe, expect, it } from 'vitest';
import { DEFAULTS, ROLE_DOMAINS, validateConfig, withDefaults } from '../src/config';

const MIN = {
  type: 'custom:hru-card',
  supply_temp: 'sensor.supply',
  extract_temp: 'sensor.extract',
};

describe('validateConfig', () => {
  it('valid minimal config has no errors', () => {
    expect(validateConfig(MIN)).toEqual({ errors: [], warnings: [] });
  });
  it('full valid config has no errors or warnings', () => {
    const r = validateConfig({
      ...MIN,
      layout: 'compact',
      theme: 'dark',
      accent: '#9575cd',
      animations: false,
      name: 'HRU',
      icon: 'mdi:fan',
      intake_temp: 'sensor.i',
      exhaust_temp: 'sensor.e',
      supply_fan: 'fan.supply',
      extract_fan: 'number.extract',
      max_rpm: 2500,
      mode: 'climate.hru',
      mode_speeds: { kitchen: 'max' },
      efficiency: 'sensor.eff',
      filter: 'binary_sensor.filter',
      filter_limit: 3000,
      filter_warning: 40,
      filter_critical: 70,
      bypass: 'switch.bypass',
      heater: 'binary_sensor.heater',
      defrost: 'sensor.defrost',
      recovered_power: 'sensor.rp',
      power: 'sensor.p',
      humidity: 'sensor.h',
      co2: 'sensor.c',
      airflow: 'sensor.a',
    });
    expect(r).toEqual({ errors: [], warnings: [] });
  });
  it('not an object is an error', () => {
    expect(validateConfig(null).errors).toHaveLength(1);
    expect(validateConfig('x').errors).toHaveLength(1);
    expect(validateConfig([]).errors).toHaveLength(1);
  });
  it('bad layout is an error', () => {
    expect(validateConfig({ ...MIN, layout: 'grid' }).errors).toEqual([
      'layout: expected one of flow, lanes, compact, got grid',
    ]);
  });
  it('bad theme is an error', () => {
    expect(validateConfig({ ...MIN, theme: 'neon' }).errors).toEqual([
      'theme: expected one of auto, light, dark, got neon',
    ]);
  });
  it('bad entity id is an error', () => {
    expect(validateConfig({ ...MIN, supply_temp: 'Sensor Supply' }).errors).toEqual([
      'supply_temp: invalid entity id "Sensor Supply"',
    ]);
    expect(validateConfig({ ...MIN, power: 42 }).errors).toEqual(['power: invalid entity id "42"']);
  });
  it('non-positive numbers are errors', () => {
    const r = validateConfig({ ...MIN, max_rpm: 0, filter_limit: -1, filter_warning: 'x' });
    expect(r.errors).toEqual([
      'max_rpm: expected a positive number',
      'filter_limit: expected a positive number',
      'filter_warning: expected a positive number',
    ]);
  });
  it('warning >= critical is an error', () => {
    expect(validateConfig({ ...MIN, filter_warning: 80, filter_critical: 80 }).errors).toEqual([
      'filter_warning (80) must be lower than filter_critical (80)',
    ]);
    expect(validateConfig({ ...MIN, filter_warning: 90 }).errors).toEqual([
      'filter_warning (90) must be lower than filter_critical (80)',
    ]);
  });
  it('bad mode_speeds is an error', () => {
    expect(validateConfig({ ...MIN, mode_speeds: { away: 'slow' } }).errors).toEqual([
      'mode_speeds.away: expected one of off, low, medium, high, max, got slow',
    ]);
    expect(validateConfig({ ...MIN, mode_speeds: 'x' }).errors).toEqual([
      'mode_speeds: expected a map of mode name to speed',
    ]);
  });
  it('bad style types are errors', () => {
    expect(
      validateConfig({ ...MIN, animations: 'yes', accent: 3, name: 1, icon: 2 }).errors,
    ).toEqual([
      'name: expected text',
      'icon: expected text',
      'accent: expected text',
      'animations: expected true or false',
    ]);
  });
  it('unknown key warns', () => {
    expect(validateConfig({ ...MIN, outdoor_temp: 'sensor.x' }).warnings).toEqual([
      'outdoor_temp: unknown option',
    ]);
  });
  it('wrong domain warns with message', () => {
    expect(validateConfig({ ...MIN, supply_fan: 'light.kitchen' }).warnings).toEqual([
      'supply_fan: expected sensor, fan or number entity, got light.kitchen',
    ]);
    expect(validateConfig({ ...MIN, supply_temp: 'number.x' }).warnings).toEqual([
      'supply_temp: expected sensor entity, got number.x',
    ]);
  });

  it('target_temp accepts a climate entity and warns on other domains', () => {
    expect(validateConfig({ ...MIN, target_temp: 'climate.hru' }).warnings).toEqual([]);
    expect(validateConfig({ ...MIN, target_temp: 'switch.x' }).warnings).toHaveLength(1);
  });
  it('fewer than two temperatures warns', () => {
    expect(validateConfig({ type: 'custom:hru-card', supply_temp: 'sensor.s' }).warnings).toEqual([
      'map at least two of intake_temp, supply_temp, extract_temp, exhaust_temp',
    ]);
  });
  it('empty strings are treated as unset', () => {
    expect(validateConfig({ ...MIN, power: '' })).toEqual({ errors: [], warnings: [] });
  });
});

describe('withDefaults', () => {
  it('fills values without overwriting', () => {
    const c = withDefaults({ ...MIN, layout: 'lanes', max_rpm: 2000 });
    expect(c.layout).toBe('lanes');
    expect(c.max_rpm).toBe(2000);
    expect(c.theme).toBe('auto');
    expect(c.animations).toBe(true);
    expect(c.filter_warning).toBe(50);
    expect(c.filter_critical).toBe(80);
    expect(c.icon).toBe('mdi:fan');
    expect(c.supply_temp).toBe('sensor.supply');
  });
  it('ignores explicit undefined or empty values', () => {
    const c = withDefaults({ ...MIN, layout: undefined, icon: '' });
    expect(c.layout).toBe('flow');
    expect(c.icon).toBe('mdi:fan');
  });
  it('does not fill name so device name can be used', () => {
    expect(withDefaults(MIN).name).toBeUndefined();
  });
  it('DEFAULTS and ROLE_DOMAINS', () => {
    expect(DEFAULTS.layout).toBe('flow');
    expect(ROLE_DOMAINS.mode).toEqual(['select', 'input_select', 'fan', 'climate', 'sensor']);
    expect(Object.keys(ROLE_DOMAINS)).toHaveLength(18);
    expect(ROLE_DOMAINS.target_temp).toEqual(['sensor', 'number', 'input_number', 'climate']);
  });
});
