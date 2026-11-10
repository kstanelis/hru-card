import type { HassEntity, HomeAssistant } from '../src/types';

export function state(id: string, value: string, attrs: Record<string, unknown> = {}): HassEntity {
  return {
    entity_id: id,
    state: value,
    attributes: attrs,
    last_changed: '2026-01-01T00:00:00Z',
    last_updated: '2026-01-01T00:00:00Z',
  };
}

export function makeHass(
  entities: HassEntity[],
  extra: Partial<HomeAssistant> = {},
): HomeAssistant {
  return {
    states: Object.fromEntries(entities.map((e) => [e.entity_id, e])),
    ...extra,
  };
}
