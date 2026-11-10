import { describe, expect, it } from 'vitest';
import { fanLevel } from '../../src/model/fan';
import { makeHass, state } from '../helpers';

describe('fanLevel', () => {
  const hass = makeHass([
    state('sensor.pct', '45', { unit_of_measurement: '%' }),
    state('sensor.rpm', '1500', { unit_of_measurement: 'rpm' }),
    state('sensor.rpm_hi', '4000', { unit_of_measurement: 'rpm' }),
    state('sensor.neg', '-5', { unit_of_measurement: '%' }),
    state('sensor.over', '130', { unit_of_measurement: '%' }),
    state('sensor.frac', '44.6', { unit_of_measurement: '%' }),
    state('sensor.bad', 'abc', { unit_of_measurement: '%' }),
    state('sensor.un', 'unavailable', { unit_of_measurement: '%' }),
    state('fan.x', 'on', { percentage: 70 }),
    state('fan.off', 'off', { percentage: null }),
    state('fan.nopct', 'on', {}),
  ]);

  it('reads percent sensor', () => {
    expect(fanLevel(hass, 'sensor.pct')).toBe(45);
  });
  it('normalises rpm', () => {
    expect(fanLevel(hass, 'sensor.rpm', 3000)).toBe(50);
  });
  it('uses default max rpm of 3000', () => {
    expect(fanLevel(hass, 'sensor.rpm')).toBe(50);
  });
  it('reads fan entity percentage', () => {
    expect(fanLevel(hass, 'fan.x')).toBe(70);
  });
  it('treats fan entity off as 0', () => {
    expect(fanLevel(hass, 'fan.off')).toBe(0);
  });
  it('returns null for fan entity on without percentage', () => {
    expect(fanLevel(hass, 'fan.nopct')).toBeNull();
  });
  it('clamps', () => {
    expect(fanLevel(hass, 'sensor.rpm_hi')).toBe(100);
    expect(fanLevel(hass, 'sensor.neg')).toBe(0);
    expect(fanLevel(hass, 'sensor.over')).toBe(100);
  });
  it('rounds to integer', () => {
    expect(fanLevel(hass, 'sensor.frac')).toBe(45);
  });
  it('null when unavailable, missing, unmapped or non-numeric', () => {
    expect(fanLevel(hass, 'sensor.un')).toBeNull();
    expect(fanLevel(hass, 'sensor.nope')).toBeNull();
    expect(fanLevel(hass, undefined)).toBeNull();
    expect(fanLevel(hass, 'sensor.bad')).toBeNull();
  });
});
