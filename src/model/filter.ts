import { S } from '../strings';
import type { HomeAssistant, HruCardConfig } from '../types';
import { readNumber, readState } from './read';

export type FilterSeverity = 'ok' | 'warning' | 'critical';

export interface FilterStatus {
  entity: string;
  level: number | null;
  severity: FilterSeverity;
  label: string;
}

export const FILTER_WARNING = 50;
export const FILTER_CRITICAL = 80;

export function filterStatus(
  hass: HomeAssistant,
  cfg: Pick<HruCardConfig, 'filter' | 'filter_limit' | 'filter_warning' | 'filter_critical'>,
): FilterStatus | null {
  const entity = cfg.filter;
  if (!entity) return null;
  const unknown: FilterStatus = {
    entity,
    level: null,
    severity: 'ok',
    label: S.filterLevel(S.noValue),
  };

  if (entity.startsWith('binary_sensor.')) {
    const st = readState(hass, entity);
    if (!st) return unknown;
    return st.state === 'on'
      ? { entity, level: null, severity: 'critical', label: S.replaceFilter }
      : { entity, level: null, severity: 'ok', label: S.filterOk };
  }

  const raw = readNumber(hass, entity);
  if (raw === null) return unknown;
  const pct = cfg.filter_limit ? (raw / cfg.filter_limit) * 100 : raw;
  const level = Math.round(Math.min(100, Math.max(0, pct)));
  const warning = cfg.filter_warning ?? FILTER_WARNING;
  const critical = cfg.filter_critical ?? FILTER_CRITICAL;
  const severity: FilterSeverity =
    level >= critical ? 'critical' : level >= warning ? 'warning' : 'ok';
  return { entity, level, severity, label: S.filterLevel(`${String(level)}%`) };
}
