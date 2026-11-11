import { render, html } from 'lit';
import { describe, expect, it, vi, type Mock } from 'vitest';
import {
  renderBar,
  renderChips,
  renderHeader,
  renderStopped,
  tappable,
} from '../../src/render/shared';
import type { CardModel, Chip, FilterView, RenderCtx } from '../../src/types';

function model(over: Partial<CardModel> = {}): CardModel {
  return {
    name: 'Ventilation',
    icon: 'mdi:fan',
    subtitle: '',
    mode: { entity: 'select.mode', label: 'Normal' },
    running: true,
    stopped: null,
    temps: {},
    tempCount: 0,
    fans: {},
    motion: { supply: 1, extract: 1, spin: 2.4 },
    recovery: null,
    filter: null,
    chips: [],
    extras: [],
    hero: null,
    ...over,
  };
}

function mount(tpl: unknown): HTMLDivElement {
  const el = document.createElement('div');
  render(tpl, el);
  return el;
}

function ctx(): RenderCtx & { moreInfo: Mock<(entityId: string) => void> } {
  return { moreInfo: vi.fn<(entityId: string) => void>() };
}

const heaterOn: Chip = {
  kind: 'heater',
  entity: 'binary_sensor.heater',
  active: true,
  icon: 'mdi:fire',
  label: 'Heater on',
};
const bypassOpen: Chip = {
  kind: 'bypass',
  entity: 'binary_sensor.bypass',
  active: true,
  icon: 'mdi:debug-step-over',
  label: 'Bypass open',
};
const defrostIdle: Chip = {
  kind: 'defrost',
  entity: 'binary_sensor.defrost',
  active: false,
  icon: 'mdi:snowflake',
  label: 'Defrost idle',
};
const filter = (level: number, severity: FilterView['severity']): FilterView => ({
  entity: 'sensor.filter',
  level,
  severity,
  label: `Filter ${String(level)}%`,
});

describe('renderHeader', () => {
  it('running: icon in a spin target, name and mode pill, empty subtitle line', () => {
    const el = mount(renderHeader(model(), ctx()));
    const icon = el.querySelector('ha-icon.spin');
    expect(icon?.getAttribute('icon')).toBe('mdi:fan');
    expect(icon?.getAttribute('data-motion')).toBe('spin');
    expect(el.querySelector('.name')?.textContent).toBe('Ventilation');
    // Empty line stays in the DOM; CSS min-height keeps the header height on start/stop.
    expect(el.querySelector('.subtitle')?.textContent).toBe('');
    expect(el.querySelector('.pill')?.textContent.trim()).toBe('Normal');
  });

  it('stopped: shows the stopped subtitle', () => {
    const el = mount(
      renderHeader(
        model({
          running: false,
          stopped: { label: 'Unit off', icon: 'mdi:power' },
          subtitle: 'Unit off · no airflow',
          mode: { entity: 'select.mode', label: 'Off' },
        }),
        ctx(),
      ),
    );
    const line = el.querySelector('.subtitle');
    expect(line?.textContent).toBe('Unit off · no airflow');
  });

  it('no subtitle row when the unit can never stop', () => {
    const el = mount(renderHeader(model({ subtitle: null }), ctx()));
    expect(el.querySelector('.subtitle')).toBeNull();
  });

  it('mode pill opens more-info for the mode entity', () => {
    const c = ctx();
    const el = mount(renderHeader(model(), c));
    el.querySelector<HTMLButtonElement>('button.pill')?.click();
    expect(c.moreInfo).toHaveBeenCalledWith('select.mode');
  });

  it('omits the pill when mode is not available', () => {
    const el = mount(renderHeader(model({ mode: null }), ctx()));
    expect(el.querySelector('.pill')).toBeNull();
  });

  it('compact variant adds header--compact class', () => {
    const el = mount(renderHeader(model(), ctx(), { compact: true }));
    expect(el.querySelector('.header')?.classList.contains('header--compact')).toBe(true);
    const plain = mount(renderHeader(model(), ctx()));
    expect(plain.querySelector('.header')?.classList.contains('header--compact')).toBe(false);
  });

  it('compact variant omits the subtitle (hero and ring carry it)', () => {
    const el = mount(
      renderHeader(model({ subtitle: 'Unit off · no airflow' }), ctx(), { compact: true }),
    );
    expect(el.querySelector('.subtitle')).toBeNull();
    expect(el.querySelector('.pill')).not.toBeNull();
  });
});

describe('renderChips', () => {
  it('renderChips shows heater on with mdi:fire', () => {
    const el = mount(renderChips([heaterOn], null, ctx()));
    expect(el.querySelector('ha-icon[icon="mdi:fire"]')).not.toBeNull();
    const chip = el.querySelector('.chip');
    expect(chip?.classList.contains('chip--active-warm')).toBe(true);
    expect(chip?.textContent).toContain('Heater on');
  });

  it('active bypass is cool, idle defrost is neutral', () => {
    const el = mount(renderChips([bypassOpen, defrostIdle], null, ctx()));
    const [bypass, defrost] = Array.from(el.querySelectorAll('.chip'));
    expect(bypass.classList.contains('chip--active-cool')).toBe(true);
    expect(defrost.className).not.toMatch(/chip--active/);
  });

  it('filter chip has critical class at 88%', () => {
    const el = mount(renderChips([], filter(88, 'critical'), ctx()));
    const chip = el.querySelector('.chip');
    expect(chip?.classList.contains('chip--critical')).toBe(true);
    expect(el.querySelector('ha-icon[icon="mdi:air-filter"]')).not.toBeNull();
    expect(chip?.textContent).toContain('Filter 88%');
  });

  it('filter chip ok and warning classes', () => {
    expect(
      mount(renderChips([], filter(10, 'ok'), ctx())).querySelector('.chip--ok'),
    ).not.toBeNull();
    expect(
      mount(renderChips([], filter(60, 'warning'), ctx())).querySelector('.chip--warning'),
    ).not.toBeNull();
  });

  it('chips open more-info for their entity', () => {
    const c = ctx();
    const el = mount(renderChips([heaterOn], filter(10, 'ok'), c));
    const buttons = el.querySelectorAll<HTMLButtonElement>('button.chip');
    buttons[0].click();
    buttons[1].click();
    expect(c.moreInfo.mock.calls).toEqual([['binary_sensor.heater'], ['sensor.filter']]);
  });

  it('renders nothing without chips or filter', () => {
    const el = mount(renderChips([], null, ctx()));
    expect(el.querySelector('.chips')).toBeNull();
  });
});

describe('renderStopped', () => {
  it('renderStopped standby uses mdi:power-sleep', () => {
    const el = mount(
      renderStopped(
        model({ running: false, stopped: { label: 'Standby', icon: 'mdi:power-sleep' } }),
        28,
      ),
    );
    const icon = el.querySelector('ha-icon');
    expect(icon?.getAttribute('icon')).toBe('mdi:power-sleep');
    expect((icon as HTMLElement | null)?.style.getPropertyValue('--mdc-icon-size')).toBe('28px');
    expect(el.querySelector('.stopped-label')?.textContent).toBe('Standby');
  });

  it('renders nothing while running', () => {
    const el = mount(renderStopped(model(), 28));
    expect(el.querySelector('.stopped')).toBeNull();
  });
});

describe('renderBar', () => {
  it('fills to the level with the given colour variable', () => {
    const el = mount(renderBar(42, '--hru-accent'));
    const fill = el.querySelector<HTMLElement>('.bar-fill');
    expect(fill?.style.getPropertyValue('width')).toBe('42%');
    expect(fill?.style.getPropertyValue('background')).toBe('var(--hru-accent)');
    expect(el.querySelector('.bar')?.getAttribute('aria-valuenow')).toBe('42');
  });

  it('null level renders an empty bar', () => {
    const el = mount(renderBar(null, '--hru-ok'));
    expect(el.querySelector<HTMLElement>('.bar-fill')?.style.getPropertyValue('width')).toBe('0%');
    expect(el.querySelector('.bar')?.hasAttribute('aria-valuenow')).toBe(false);
  });
});

describe('tappable', () => {
  it('wraps content in a value button that opens more-info', () => {
    const c = ctx();
    const el = mount(tappable('sensor.supply', c, html`<span class="t">21°</span>`));
    const btn = el.querySelector<HTMLButtonElement>('button.value');
    expect(btn?.getAttribute('type')).toBe('button');
    expect(btn?.querySelector('.t')?.textContent).toBe('21°');
    btn?.click();
    expect(c.moreInfo).toHaveBeenCalledWith('sensor.supply');
  });
});
