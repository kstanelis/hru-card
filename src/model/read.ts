import { S } from '../strings';
import type { HassEntity, HomeAssistant } from '../types';

const TRUE_STATES = new Set(['on', 'open', 'true', 'heat', 'active']);
const FALSE_STATES = new Set(['off', 'closed', 'false', 'idle']);

export function readState(hass: HomeAssistant, id?: string): HassEntity | null {
  if (!id) return null;
  const entity = hass.states[id] as HassEntity | undefined;
  if (!entity || entity.state === 'unknown' || entity.state === 'unavailable') return null;
  return entity;
}

export function readNumber(hass: HomeAssistant, id?: string): number | null {
  const entity = readState(hass, id);
  if (!entity) return null;
  const n = parseFloat(entity.state);
  return Number.isNaN(n) ? null : n;
}

export function readOnOff(hass: HomeAssistant, id?: string): boolean | null {
  const entity = readState(hass, id);
  if (!entity) return null;
  const s = entity.state.toLowerCase();
  if (TRUE_STATES.has(s)) return true;
  if (FALSE_STATES.has(s)) return false;
  const n = parseFloat(s);
  return Number.isNaN(n) ? null : n > 0;
}

export function formatTemp(hass: HomeAssistant, value: number | null): string {
  if (value === null) return S.noValue;
  const locale = hass.locale?.language ?? hass.language ?? 'en';
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
  return `${formatted}°`;
}

export function formatValue(hass: HomeAssistant, id?: string): string {
  const entity = readState(hass, id);
  if (!entity) return S.noValue;
  if (hass.formatEntityState) return hass.formatEntityState(entity);
  const n = parseFloat(entity.state);
  if (Number.isNaN(n)) return entity.state;
  const unit = entity.attributes.unit_of_measurement;
  const num = String(Math.round(n * 10) / 10);
  return typeof unit === 'string' && unit ? `${num} ${unit}` : num;
}
