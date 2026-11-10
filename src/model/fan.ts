import type { HomeAssistant } from '../types';
import { readState } from './read';

const clamp = (n: number): number => Math.min(100, Math.max(0, n));

/** Fan speed as 0–100 %, from a percent/rpm sensor, number or fan entity. */
export function fanLevel(
  hass: HomeAssistant,
  id: string | undefined,
  maxRpm = 3000,
): number | null {
  const entity = readState(hass, id);
  if (!entity) return null;
  let raw: number;
  if (entity.entity_id.startsWith('fan.')) {
    if (entity.state === 'off') return 0;
    const pct = entity.attributes.percentage;
    if (typeof pct !== 'number') return null;
    raw = pct;
  } else {
    const n = parseFloat(entity.state);
    if (Number.isNaN(n)) return null;
    raw = entity.attributes.unit_of_measurement === 'rpm' ? (n / maxRpm) * 100 : n;
  }
  return Math.round(clamp(raw));
}
