import { describe, expect, it, vi } from 'vitest';
import { formatTemp, formatValue, readNumber, readOnOff, readState } from '../../src/model/read';
import { makeHass, state } from '../helpers';

describe('readState', () => {
  const hass = makeHass([state('sensor.a', '1'), state('sensor.u', 'unavailable')]);
  it('returns null for empty or undefined id', () => {
    expect(readState(hass, '')).toBeNull();
    expect(readState(hass)).toBeNull();
  });
  it('returns the entity when present', () => {
    expect(readState(hass, 'sensor.a')?.state).toBe('1');
  });
});

describe('readNumber', () => {
  const hass = makeHass([
    state('sensor.un', 'unavailable'),
    state('sensor.uk', 'unknown'),
    state('sensor.t', '4.0'),
    state('sensor.bad', 'abc'),
  ]);
  it('returns null for missing entity', () => {
    expect(readNumber(hass, 'sensor.nope')).toBeNull();
  });
  it('returns null for unavailable', () => {
    expect(readNumber(hass, 'sensor.un')).toBeNull();
  });
  it('returns null for unknown', () => {
    expect(readNumber(hass, 'sensor.uk')).toBeNull();
  });
  it('returns null for non-numeric', () => {
    expect(readNumber(hass, 'sensor.bad')).toBeNull();
  });
  it('parses "4.0"', () => {
    expect(readNumber(hass, 'sensor.t')).toBe(4);
  });
});

describe('readOnOff', () => {
  it.each([
    ['on', true],
    ['off', false],
    ['open', true],
    ['closed', false],
    ['true', true],
    ['false', false],
    ['heat', true],
    ['active', true],
    ['idle', false],
    ['0', false],
    ['12.5', true],
    ['foo', null],
  ])('maps %s to %s', (value, expected) => {
    const hass = makeHass([state('x.y', value)]);
    expect(readOnOff(hass, 'x.y')).toBe(expected);
  });
  it('returns null for missing', () => {
    expect(readOnOff(makeHass([]), 'x.y')).toBeNull();
  });
});

describe('formatTemp', () => {
  it('formats en', () => {
    expect(formatTemp(makeHass([], { language: 'en' }), 4)).toBe('4.0°');
  });
  it('formats de via locale', () => {
    expect(formatTemp(makeHass([], { locale: { language: 'de' } }), 19.5)).toBe('19,5°');
  });
  it('falls back to en without language', () => {
    expect(formatTemp(makeHass([]), 4)).toBe('4.0°');
  });
  it('returns dash for null', () => {
    expect(formatTemp(makeHass([]), null)).toBe('—');
  });
});

describe('formatValue', () => {
  it('uses hass.formatEntityState when present', () => {
    const e = state('sensor.p', '48', { unit_of_measurement: 'W' });
    const spy = vi.fn(() => '48 W');
    const hass = makeHass([e], { formatEntityState: spy });
    expect(formatValue(hass, 'sensor.p')).toBe('48 W');
    expect(spy).toHaveBeenCalledWith(e);
  });
  it('falls back to value and unit', () => {
    const hass = makeHass([state('sensor.p', '48', { unit_of_measurement: 'W' })]);
    expect(formatValue(hass, 'sensor.p')).toBe('48 W');
  });
  it('limits fallback to one decimal', () => {
    const hass = makeHass([state('sensor.p', '48.26', { unit_of_measurement: '%' })]);
    expect(formatValue(hass, 'sensor.p')).toBe('48.3 %');
  });
  it('omits unit when absent', () => {
    const hass = makeHass([state('sensor.p', '48')]);
    expect(formatValue(hass, 'sensor.p')).toBe('48');
  });
  it('returns raw state for non-numeric', () => {
    const hass = makeHass([state('sensor.m', 'Away', { unit_of_measurement: 5 })]);
    expect(formatValue(hass, 'sensor.m')).toBe('Away');
  });
  it('returns dash when missing', () => {
    expect(formatValue(makeHass([]), 'sensor.nope')).toBe('—');
  });
});
