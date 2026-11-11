import { render } from 'lit';
import { describe, expect, it, vi } from 'vitest';
import { renderFlow } from '../../src/render/flow';
import type { CardModel } from '../../src/types';
import { cardModel } from '../helpers';

function mount(m: CardModel, moreInfo = vi.fn<(id: string) => void>()) {
  const el = document.createElement('div');
  render(renderFlow(m, { moreInfo }), el);
  return { el, moreInfo, text: el.textContent.replace(/\s+/g, ' ') };
}

describe('renderFlow', () => {
  it('flow shows four temps with labels', () => {
    const { text } = mount(cardModel());
    for (const label of ['Intake', 'Supply', 'Extract', 'Exhaust']) expect(text).toContain(label);
    expect(text).toContain('19.5°');
    expect(text).toContain('6.5°');
  });

  it('shows fan levels under exhaust and supply', () => {
    const { el } = mount(cardModel());
    expect(el.querySelector('.corner--exhaust')?.textContent).toMatch(/Exhaust · fan 42%/);
    expect(el.querySelector('.corner--supply')?.textContent).toMatch(/Supply · fan 45%/);
  });

  it('omits fan text when fan is not mapped', () => {
    const { el } = mount(cardModel({ fans: {} }));
    expect(el.querySelector('.corner--supply')?.textContent).not.toMatch(/fan/);
  });

  it('flow badge shows ≈86%', () => {
    const { el } = mount(cardModel());
    const badge = el.querySelector('.badge');
    expect(badge?.textContent.replace(/\s+/g, '')).toBe('≈86%recovery');
  });

  it('sensor recovery has no ≈ and opens the efficiency sensor', () => {
    const { el, moreInfo } = mount(
      cardModel({ recovery: { value: 90, approx: false, entity: 'sensor.eff' } }),
    );
    const btn = el.querySelector<HTMLButtonElement>('.badge button.value');
    expect(btn?.textContent.trim()).toBe('90%');
    btn?.click();
    expect(moreInfo).toHaveBeenCalledWith('sensor.eff');
  });

  it('flow badge shows Standby when stopped', () => {
    const { el } = mount(
      cardModel({
        running: false,
        recovery: null,
        stopped: { label: 'Standby', icon: 'mdi:power-sleep' },
      }),
    );
    const badge = el.querySelector('.badge');
    expect(badge?.querySelector('ha-icon')?.getAttribute('icon')).toBe('mdi:power-sleep');
    expect(badge?.textContent).toContain('Standby');
    expect(badge?.textContent).not.toContain('%');
  });

  it('hides badge when running without recovery', () => {
    const { el } = mount(cardModel({ recovery: null }));
    expect(el.querySelector('.badge')).toBeNull();
  });

  it('flow missing temp shows —', () => {
    const m = cardModel();
    m.temps.exhaust = {
      key: 'exhaust',
      entity: 'sensor.exhaust',
      value: null,
      display: '—',
      label: 'Exhaust',
    };
    const { el } = mount(m);
    expect(el.querySelector('.corner--exhaust .temp')?.textContent.trim()).toBe('—');
  });

  it('unmapped temp shows — without a button', () => {
    const m = cardModel();
    delete m.temps.exhaust;
    const { el } = mount(m);
    expect(el.querySelector('.corner--exhaust .temp')?.textContent.trim()).toBe('—');
    expect(el.querySelector('.corner--exhaust button')).toBeNull();
  });

  it('flow has motion targets', () => {
    const { el } = mount(cardModel());
    expect(el.querySelector('path[data-motion="supply"]')).not.toBeNull();
    expect(el.querySelector('path[data-motion="extract"]')).not.toBeNull();
    expect(el.querySelector('[data-motion="spin"]')).not.toBeNull();
  });

  it('svg scales to width', () => {
    const svg = mount(cardModel()).el.querySelector('svg');
    expect(svg?.getAttribute('viewBox')).toBe('0 0 438 240');
    expect(svg?.getAttribute('preserveAspectRatio')).toBe('xMidYMid meet');
  });

  it('clicking a temperature calls moreInfo', () => {
    const { el, moreInfo } = mount(cardModel());
    el.querySelector<HTMLButtonElement>('.corner--supply button.value')?.click();
    expect(moreInfo).toHaveBeenCalledWith('sensor.supply');
  });

  it('renders chips including filter, and extras in a grid', () => {
    const { el, moreInfo } = mount(cardModel());
    expect(el.querySelectorAll('.chip')).toHaveLength(2);
    const extras = el.querySelectorAll('.extras .extra');
    expect(extras).toHaveLength(2);
    expect(extras[0].textContent).toContain('Recovered');
    expect(extras[0].textContent).toContain('1.2 kW');
    el.querySelector<HTMLButtonElement>('.extras button.value')?.click();
    expect(moreInfo).toHaveBeenCalledWith('sensor.recovered');
  });

  it('omits extras grid without extras', () => {
    const { el } = mount(cardModel({ extras: [] }));
    expect(el.querySelector('.extras')).toBeNull();
  });

  it('shows the target temperature under the badge and opens its entity', () => {
    const { el, moreInfo } = mount(
      cardModel({ target: { entity: 'sensor.target', display: '21.0°' } }),
    );
    const target = el.querySelector('.target');
    expect(target?.textContent.replace(/\s+/g, ' ').trim()).toBe('Target 21.0°');
    target?.querySelector<HTMLButtonElement>('button.value')?.click();
    expect(moreInfo).toHaveBeenCalledWith('sensor.target');
  });

  it('keeps the target temperature while stopped', () => {
    const { el } = mount(
      cardModel({
        running: false,
        stopped: { label: 'Unit off', icon: 'mdi:power' },
        target: { entity: 'sensor.target', display: '21.0°' },
      }),
    );
    expect(el.querySelector('.target')).not.toBeNull();
  });

  it('omits the target temperature when not mapped', () => {
    expect(mount(cardModel()).el.querySelector('.target')).toBeNull();
  });
});
