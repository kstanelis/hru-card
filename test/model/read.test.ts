import { describe, expect, it, vi } from 'vitest';
import { formatTemp, formatValue, readNumber, readOnOff, readState } from '../../src/model/read';
import { makeHass, state } from '../helpers';

describe('readState', () => {
  const hass = makeHass([state('sensor.a', '1')]);
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
  it.each([['12abc'], [''], ['  '], ['Infinity'], ['-Infinity'], ['NaN'], ['0x10']])(
    'rejects partly numeric or non-finite %j',
    (value) => {
      expect(readNumber(makeHass([state('sensor.x', value)]), 'sensor.x')).toBeNull();
    },
  );
  it('accepts surrounding whitespace, sign and exponent', () => {
    expect(readNumber(makeHass([state('sensor.x', ' -2.5 ')]), 'sensor.x')).toBe(-2.5);
    expect(readNumber(makeHass([state('sensor.x', '1e3')]), 'sensor.x')).toBe(1000);
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
    ['1abc', null],
    ['Infinity', null],
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
  it('returns dash for non-finite values', () => {
    expect(formatTemp(makeHass([]), Number.NaN)).toBe('—');
    expect(formatTemp(makeHass([]), Infinity)).toBe('—');
  });
  it('falls back to en for an empty or malformed locale', () => {
    expect(formatTemp(makeHass([], { locale: { language: '' } }), 4)).toBe('4.0°');
    expect(formatTemp(makeHass([], { language: 'not a locale!' }), 4)).toBe('4.0°');
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
  it('fallback number follows the locale', () => {
    const hass = makeHass([state('sensor.p', '48.26', { unit_of_measurement: 'W' })], {
      locale: { language: 'de' },
    });
    expect(formatValue(hass, 'sensor.p')).toBe('48,3 W');
  });
  it('fallback does not group thousands', () => {
    const hass = makeHass([state('sensor.r', '1320', { unit_of_measurement: 'rpm' })]);
    expect(formatValue(hass, 'sensor.r')).toBe('1320 rpm');
  });
  it('fallback keeps raw state for partly numeric values', () => {
    const hass = makeHass([state('sensor.p', '12abc', { unit_of_measurement: 'W' })]);
    expect(formatValue(hass, 'sensor.p')).toBe('12abc');
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
