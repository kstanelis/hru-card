import { S } from '../strings';
import type { HassEntity, HomeAssistant } from '../types';

const TRUE_STATES = new Set(['on', 'open', 'true', 'heat', 'active']);
const FALSE_STATES = new Set(['off', 'closed', 'false', 'idle']);
const DECIMAL = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;

/** Whole-string decimal parse: "12abc", "0x10", "" and non-finite values are not numbers. */
export function parseNumber(raw: string): number | null {
  const s = raw.trim();
  if (!DECIMAL.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const TEMP_FORMAT: Intl.NumberFormatOptions = {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
};
const VALUE_FORMAT: Intl.NumberFormatOptions = { maximumFractionDigits: 1, useGrouping: false };
const formatters = new Map<Intl.NumberFormatOptions, Map<string, Intl.NumberFormat>>();

/** Cached formatter for the user's language; malformed tags fall back to English. */
function numberFormat(hass: HomeAssistant, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const locale = hass.locale?.language ?? hass.language ?? 'en';
  let byLocale = formatters.get(options);
  if (!byLocale) formatters.set(options, (byLocale = new Map<string, Intl.NumberFormat>()));
  let format = byLocale.get(locale);
  if (!format) {
    try {
      format = new Intl.NumberFormat(locale, options);
    } catch {
      format = new Intl.NumberFormat('en', options);
    }
    byLocale.set(locale, format);
  }
  return format;
}

export function readState(hass: HomeAssistant, id?: string): HassEntity | null {
  if (!id) return null;
  const entity = hass.states[id] as HassEntity | undefined;
  if (!entity || entity.state === 'unknown' || entity.state === 'unavailable') return null;
  return entity;
}

export function readNumber(hass: HomeAssistant, id?: string): number | null {
  const entity = readState(hass, id);
  if (!entity) return null;
  return parseNumber(entity.state);
}

export function readOnOff(hass: HomeAssistant, id?: string): boolean | null {
  const entity = readState(hass, id);
  if (!entity) return null;
  const s = entity.state.toLowerCase();
  if (TRUE_STATES.has(s)) return true;
  if (FALSE_STATES.has(s)) return false;
  const n = parseNumber(s);
  return n === null ? null : n > 0;
}

export function formatTemp(hass: HomeAssistant, value: number | null): string {
  if (value === null || !Number.isFinite(value)) return S.noValue;
  const formatted = numberFormat(hass, TEMP_FORMAT).format(value);
  return `${formatted}°`;
}

export function formatValue(hass: HomeAssistant, id?: string): string {
  const entity = readState(hass, id);
  if (!entity) return S.noValue;
  if (hass.formatEntityState) return hass.formatEntityState(entity);
  const n = parseNumber(entity.state);
  if (n === null) return entity.state;
  const unit = entity.attributes.unit_of_measurement;
  const num = numberFormat(hass, VALUE_FORMAT).format(n);
  return typeof unit === 'string' && unit ? `${num} ${unit}` : num;
}
