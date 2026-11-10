import { render } from 'lit';
import { describe, expect, it, vi } from 'vitest';
import { renderLanes } from '../../src/render/lanes';
import type { CardModel } from '../../src/types';
import { cardModel } from '../helpers';

const EXTRAS: CardModel['extras'] = [
  { key: 'recovered_power', entity: 'sensor.recovered', label: 'Recovered', display: '1.2 kW' },
  { key: 'power', entity: 'sensor.power', label: 'Power', display: '48 W' },
  { key: 'humidity', entity: 'sensor.humidity', label: 'Humidity', display: '41 %' },
  { key: 'co2', entity: 'sensor.co2', label: 'CO₂', display: '640 ppm' },
];

function mount(m: CardModel, moreInfo = vi.fn<(id: string) => void>()) {
  const el = document.createElement('div');
  render(renderLanes(m, { moreInfo }), el);
  return { el, moreInfo };
}

const text = (el: Element | null): string => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

describe('renderLanes', () => {
  it('lanes tile order', () => {
    const { el } = mount(cardModel({ extras: EXTRAS }));
    const labels = Array.from(el.querySelectorAll('.tile .label')).map((l) => text(l));
    expect(labels).toEqual(['Recovered', 'Power', 'Filter', 'Humidity', 'CO₂']);
  });

  it('lanes filter bar width 62%', () => {
    const { el } = mount(cardModel());
    const tile = el.querySelector('.tile--filter');
    expect(tile?.querySelector<HTMLElement>('.bar-fill')?.style.getPropertyValue('width')).toBe(
      '62%',
    );
    expect(
      tile?.querySelector<HTMLElement>('.bar-fill')?.style.getPropertyValue('background'),
    ).toBe('var(--hru-warn)');
    expect(tile?.querySelector('.tile-value')?.classList.contains('sev--warning')).toBe(true);
    expect(text(tile?.querySelector('.tile-value') ?? null)).toBe('62%');
  });

  it('binary filter tile shows its label without a bar', () => {
    const { el } = mount(
      cardModel({
        filter: { entity: 'binary_sensor.filter', level: null, severity: 'ok', label: 'Filter OK' },
      }),
    );
    const tile = el.querySelector('.tile--filter');
    expect(text(tile?.querySelector('.tile-value') ?? null)).toBe('Filter OK');
    expect(tile?.querySelector('.bar')).toBeNull();
  });

  it('lanes shows rpm when unit rpm', () => {
    const { el } = mount(cardModel());
    expect(text(el.querySelector('.box--supply .sub'))).toBe('fan 45% · 1320 rpm');
    expect(text(el.querySelector('.box--extract .sub'))).toBe('fan 42% · 1281 rpm');
  });

  it('fan line without rpm, and no line without fan', () => {
    const m = cardModel();
    m.fans = { supply: { entity: 'sensor.sf', level: 45, display: '45%', rpm: null } };
    const { el } = mount(m);
    expect(text(el.querySelector('.box--supply .sub'))).toBe('fan 45%');
    expect(el.querySelector('.box--extract .sub')).toBeNull();
  });

  it('intake and exhaust boxes describe the air', () => {
    const { el } = mount(cardModel());
    expect(text(el.querySelector('.box--intake'))).toBe('Intake 4.0° fresh air in');
    expect(text(el.querySelector('.box--exhaust'))).toBe('Exhaust 6.5° stale air out');
    expect(el.querySelector('.box--intake')?.classList.contains('box--cool')).toBe(true);
    expect(el.querySelector('.box--supply')?.classList.contains('box--warm')).toBe(true);
  });

  it('lanes hides unmapped tiles', () => {
    const { el } = mount(cardModel({ extras: EXTRAS, filter: null }));
    const all = text(el.querySelector('.tiles'));
    expect(all).not.toContain('Air flow');
    expect(all).not.toContain('Filter');
  });

  it('omits tile grid when nothing is mapped', () => {
    const { el } = mount(cardModel({ extras: [], filter: null }));
    expect(el.querySelector('.tiles')).toBeNull();
  });

  it('middle block has arrows as motion targets and recovery', () => {
    const { el } = mount(cardModel());
    const mid = el.querySelector('.middle');
    expect(mid?.querySelector('[data-motion="supply"]')?.getAttribute('data-dir')).toBe('right');
    expect(mid?.querySelector('[data-motion="extract"]')?.getAttribute('data-dir')).toBe('left');
    expect(text(mid?.querySelector('.recovery') ?? null)).toBe('≈86% recovery');
  });

  it('middle block shows stopped state', () => {
    const { el } = mount(
      cardModel({
        running: false,
        recovery: null,
        stopped: { label: 'Unit off', icon: 'mdi:power' },
      }),
    );
    const mid = el.querySelector('.middle');
    expect(mid?.querySelector('ha-icon')?.getAttribute('icon')).toBe('mdi:power');
    expect(text(mid)).toBe('Unit off');
  });

  it('temperatures, tiles and chips open more-info', () => {
    const { el, moreInfo } = mount(cardModel());
    el.querySelector<HTMLButtonElement>('.box--extract button.value')?.click();
    el.querySelector<HTMLButtonElement>('.tile--filter button.value')?.click();
    el.querySelector<HTMLButtonElement>('button.chip')?.click();
    expect(moreInfo.mock.calls).toEqual([
      ['sensor.extract'],
      ['sensor.filter'],
      ['binary_sensor.bypass'],
    ]);
  });

  it('chip row has no filter chip (filter is a tile)', () => {
    const { el } = mount(cardModel());
    expect(el.querySelectorAll('.chip')).toHaveLength(1);
  });

  it('unmapped temperature shows —', () => {
    const m = cardModel();
    delete m.temps.intake;
    const { el } = mount(m);
    expect(text(el.querySelector('.box--intake .temp'))).toBe('—');
  });
});
