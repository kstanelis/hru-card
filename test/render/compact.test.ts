import { render } from 'lit';
import { describe, expect, it, vi } from 'vitest';
import { renderCompact } from '../../src/render/compact';
import type { CardModel } from '../../src/types';
import { cardModel } from '../helpers';

function mount(m: CardModel, moreInfo = vi.fn<(id: string) => void>()) {
  const el = document.createElement('div');
  render(renderCompact(m, { moreInfo }), el);
  return { el, moreInfo };
}

const text = (el: Element | null | undefined): string =>
  (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

const STOPPED: Partial<CardModel> = {
  running: false,
  recovery: null,
  stopped: { label: 'Unit off', icon: 'mdi:power' },
};

describe('renderCompact', () => {
  it('uses the compact header', () => {
    const { el } = mount(cardModel());
    expect(el.querySelector('.header--compact')).not.toBeNull();
  });

  it('compact hero is supply with sub', () => {
    const { el } = mount(cardModel());
    expect(text(el.querySelector('.hero-label'))).toBe('Supply air');
    expect(text(el.querySelector('.hero-value'))).toBe('19.5°');
    expect(text(el.querySelector('.hero-sub'))).toBe('from 4.0° intake');
  });

  it('hero without sub and without hero', () => {
    const { el } = mount(
      cardModel({ hero: { key: 'extract', label: 'Extract air', display: '22.0°', sub: null } }),
    );
    expect(el.querySelector('.hero-sub')).toBeNull();
    expect(mount(cardModel({ hero: null })).el.querySelector('.hero')).toBeNull();
  });

  it('hero value opens more-info for its temperature', () => {
    const { el, moreInfo } = mount(cardModel());
    el.querySelector<HTMLButtonElement>('.hero button.value')?.click();
    expect(moreInfo).toHaveBeenCalledWith('sensor.supply');
  });

  it('compact ring dasharray for 86%', () => {
    const { el } = mount(cardModel());
    const arc = el.querySelector('.ring-arc');
    const [len, total] = (arc?.getAttribute('stroke-dasharray') ?? '').split(' ').map(Number);
    expect(len).toBeCloseTo(162.1, 1);
    expect(total).toBe(188.5);
    expect(el.querySelector('.ring svg')?.getAttribute('aria-label')).toBe(
      'Heat recovery 86 percent',
    );
    expect(text(el.querySelector('.ring-center'))).toBe('≈86% recovery');
  });

  it('compact ring arc hidden when stopped', () => {
    const { el } = mount(cardModel(STOPPED));
    expect(el.querySelector('.ring-arc')).toBeNull();
    expect(el.querySelector('.ring-track')).not.toBeNull();
    expect(el.querySelector('.ring-center ha-icon')?.getAttribute('icon')).toBe('mdi:power');
  });

  it('no ring without recovery while running', () => {
    const { el } = mount(cardModel({ recovery: null }));
    expect(el.querySelector('.ring')).toBeNull();
  });

  it('temp strip in order with side colours', () => {
    const { el } = mount(cardModel());
    const cells = Array.from(el.querySelectorAll('.strip .cell'));
    expect(cells.map((c) => text(c))).toEqual([
      'Intake 4.0°',
      'Supply 19.5°',
      'Extract 22.0°',
      'Exhaust 6.5°',
    ]);
    expect(cells.map((c) => c.classList.contains('cell--cool'))).toEqual([
      true,
      false,
      false,
      true,
    ]);
  });

  it('fan and filter bars', () => {
    const { el } = mount(cardModel());
    const rows = Array.from(el.querySelectorAll('.meter'));
    expect(rows.map((r) => text(r.querySelector('.meter-head')))).toEqual([
      'Supply fan 45%',
      'Extract fan 42%',
      'Filter clogging 62%',
    ]);
    const fills = rows.map((r) => r.querySelector<HTMLElement>('.bar-fill')?.style);
    expect(fills[0]?.getPropertyValue('width')).toBe('45%');
    expect(fills[0]?.getPropertyValue('background')).toBe('var(--hru-accent)');
    expect(fills[2]?.getPropertyValue('background')).toBe('var(--hru-warn)');
    expect(rows[2]?.querySelector('ha-icon')?.getAttribute('icon')).toBe('mdi:air-filter');
  });

  it('binary filter shows its label without a bar; unmapped fans omitted', () => {
    const m = cardModel({
      filter: {
        entity: 'binary_sensor.filter',
        level: null,
        severity: 'critical',
        label: 'Replace filter',
      },
    });
    m.fans = {};
    const { el } = mount(m);
    const rows = Array.from(el.querySelectorAll('.meter'));
    expect(rows).toHaveLength(1);
    expect(text(rows[0]?.querySelector('.meter-head'))).toBe('Filter Replace filter');
    expect(rows[0]?.querySelector('.bar')).toBeNull();
  });

  it('no meters block when no fan or filter is mapped', () => {
    const m = cardModel({ filter: null });
    m.fans = {};
    expect(mount(m).el.querySelector('.meters')).toBeNull();
  });

  it('hero for an unmapped temperature is plain text', () => {
    const m = cardModel();
    delete m.temps.supply;
    const { el } = mount(m);
    expect(el.querySelector('.hero button.value')).toBeNull();
    expect(text(el.querySelector('.hero-value'))).toBe('19.5°');
  });

  it('fans without a filter show only fan meters', () => {
    const { el } = mount(cardModel({ filter: null }));
    expect(el.querySelectorAll('.meter')).toHaveLength(2);
  });

  it('compact has chip row with heater', () => {
    const m = cardModel({
      chips: [
        {
          kind: 'heater',
          entity: 'binary_sensor.heater',
          label: 'Heater on',
          icon: 'mdi:fire',
          active: true,
        },
      ],
    });
    const { el } = mount(m);
    const chip = el.querySelector('.chips button.chip');
    expect(text(chip)).toBe('Heater on');
    expect(chip?.classList.contains('chip--active-warm')).toBe(true);
    expect(el.querySelectorAll('.chips .chip')).toHaveLength(1);
  });

  it('extras as one muted line, tappable', () => {
    const { el, moreInfo } = mount(
      cardModel({
        extras: [
          { key: 'recovered_power', entity: 'sensor.rec', label: 'Recovered', display: '1.2 kW' },
          { key: 'humidity', entity: 'sensor.rh', label: 'Humidity', display: '41 %' },
          { key: 'co2', entity: 'sensor.co2', label: 'CO₂', display: '640 ppm' },
        ],
      }),
    );
    expect(Array.from(el.querySelectorAll('.extras-line > *')).map((x) => text(x))).toEqual([
      '1.2 kW recovered',
      '41 % RH',
      '640 ppm',
    ]);
    el.querySelector<HTMLButtonElement>('.extras-line button.value')?.click();
    expect(moreInfo).toHaveBeenCalledWith('sensor.rec');
  });

  it('no extras line when nothing mapped', () => {
    expect(mount(cardModel({ extras: [] })).el.querySelector('.extras-line')).toBeNull();
  });
});
