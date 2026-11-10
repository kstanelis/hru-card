import { describe, expect, it } from 'vitest';
import { filterStatus } from '../../src/model/filter';
import { makeHass, state } from '../helpers';

const pct = (v: string) => makeHass([state('sensor.f', v, { unit_of_measurement: '%' })]);

describe('filterStatus', () => {
  it('filter percent severities', () => {
    expect(filterStatus(pct('30'), { filter: 'sensor.f' })?.severity).toBe('ok');
    expect(filterStatus(pct('50'), { filter: 'sensor.f' })?.severity).toBe('warning');
    expect(filterStatus(pct('62'), { filter: 'sensor.f' })).toEqual({
      entity: 'sensor.f',
      level: 62,
      severity: 'warning',
      label: 'Filter 62%',
    });
    expect(filterStatus(pct('80'), { filter: 'sensor.f' })?.severity).toBe('critical');
    expect(filterStatus(pct('95'), { filter: 'sensor.f' })?.severity).toBe('critical');
  });
  it('filter custom thresholds', () => {
    const cfg = { filter: 'sensor.f', filter_warning: 70, filter_critical: 90 };
    expect(filterStatus(pct('75'), cfg)?.severity).toBe('warning');
    expect(filterStatus(pct('65'), cfg)?.severity).toBe('ok');
    expect(filterStatus(pct('90'), cfg)?.severity).toBe('critical');
  });
  it('filter hours with limit', () => {
    const hass = makeHass([state('sensor.f', '1800', { unit_of_measurement: 'h' })]);
    const r = filterStatus(hass, { filter: 'sensor.f', filter_limit: 3000 });
    expect(r?.level).toBe(60);
    expect(r?.severity).toBe('warning');
  });
  it('clamps and rounds', () => {
    expect(filterStatus(pct('130'), { filter: 'sensor.f' })?.level).toBe(100);
    expect(filterStatus(pct('-4'), { filter: 'sensor.f' })?.level).toBe(0);
    expect(filterStatus(pct('61.6'), { filter: 'sensor.f' })?.level).toBe(62);
  });
  it('filter binary', () => {
    const on = makeHass([state('binary_sensor.f', 'on')]);
    const off = makeHass([state('binary_sensor.f', 'off')]);
    expect(filterStatus(on, { filter: 'binary_sensor.f' })).toEqual({
      entity: 'binary_sensor.f',
      level: null,
      severity: 'critical',
      label: 'Replace filter',
    });
    expect(filterStatus(off, { filter: 'binary_sensor.f' })).toEqual({
      entity: 'binary_sensor.f',
      level: null,
      severity: 'ok',
      label: 'Filter OK',
    });
  });
  it('unavailable or non-numeric renders dash', () => {
    const exp = { entity: 'sensor.f', level: null, severity: 'ok', label: 'Filter —' };
    expect(filterStatus(pct('unavailable'), { filter: 'sensor.f' })).toEqual(exp);
    expect(filterStatus(pct('dirty'), { filter: 'sensor.f' })).toEqual(exp);
    expect(filterStatus(makeHass([]), { filter: 'sensor.f' })).toEqual(exp);
  });
  it('binary filter unavailable renders dash', () => {
    const hass = makeHass([state('binary_sensor.f', 'unavailable')]);
    expect(filterStatus(hass, { filter: 'binary_sensor.f' })?.label).toBe('Filter —');
  });
  it('filter unset → null', () => {
    expect(filterStatus(pct('30'), {})).toBeNull();
  });
});
