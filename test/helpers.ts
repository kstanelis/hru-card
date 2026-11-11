import type { CardModel, HassEntity, HomeAssistant, TempKey, TempValue } from '../src/types';

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

/** A running, fully mapped card model for layout tests. */
export function cardModel(over: Partial<CardModel> = {}): CardModel {
  const temp = (key: TempKey, label: string, value: number): TempValue => ({
    key,
    entity: `sensor.${key}`,
    value,
    display: `${value.toFixed(1)}°`,
    label,
  });
  return {
    name: 'Ventilation',
    icon: 'mdi:fan',
    subtitle: '',
    mode: { entity: 'select.mode', label: 'Normal' },
    running: true,
    stopped: null,
    temps: {
      intake: temp('intake', 'Intake', 4),
      supply: temp('supply', 'Supply', 19.5),
      extract: temp('extract', 'Extract', 22),
      exhaust: temp('exhaust', 'Exhaust', 6.5),
    },
    tempCount: 4,
    fans: {
      supply: { entity: 'sensor.supply_fan', level: 45, display: '45%', rpm: '1320 rpm' },
      extract: { entity: 'sensor.extract_fan', level: 42, display: '42%', rpm: '1281 rpm' },
    },
    motion: { supply: 1.83, extract: 1.91, spin: 2.4 },
    recovery: { value: 86, approx: true, entity: null },
    filter: { entity: 'sensor.filter', level: 62, severity: 'warning', label: 'Filter 62%' },
    chips: [
      {
        kind: 'bypass',
        entity: 'binary_sensor.bypass',
        active: false,
        icon: 'mdi:valve-closed',
        label: 'Bypass closed',
      },
    ],
    extras: [
      { key: 'recovered_power', entity: 'sensor.recovered', label: 'Recovered', display: '1.2 kW' },
      { key: 'power', entity: 'sensor.power', label: 'Power', display: '48 W' },
    ],
    hero: { key: 'supply', label: 'Supply air', display: '19.5°', sub: 'from 4.0° intake' },
    ...over,
  };
}
