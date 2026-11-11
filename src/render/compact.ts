import { css, html, nothing, svg, type TemplateResult } from 'lit';
import { S } from '../strings';
import type { CardModel, Extra, FanValue, FilterView, RenderCtx, TempKey } from '../types';
import {
  renderBar,
  renderChips,
  renderHeader,
  renderRecovery,
  renderTemp,
  SEVERITY_COLOR,
  tappable,
} from './shared';

/** Ring circumference for r = 30 (2πr), rounded as in the design. */
const RING = 188.5;
const STRIP: readonly [TempKey, 'cool' | 'warm'][] = [
  ['intake', 'cool'],
  ['supply', 'warm'],
  ['extract', 'warm'],
  ['exhaust', 'cool'],
];

function hero(m: CardModel, ctx: RenderCtx): TemplateResult {
  const h = m.hero;
  const entity = m.temps.supply?.entity;
  const value = html`<span class="hero-value">${h.display}</span>`;
  let sub: TemplateResult | typeof nothing = nothing;
  if (h.sub) {
    const text = html`<span class="hero-sub">${h.sub.text}</span>`;
    sub = h.sub.entity ? tappable(h.sub.entity, ctx, text) : text;
  }
  return html`<div class="hero">
    ${h.label ? html`<span class="hero-label">${h.label}</span>` : nothing}
    ${entity ? tappable(entity, ctx, value) : value} ${sub}
  </div>`;
}

function ring(m: CardModel, ctx: RenderCtx): TemplateResult | typeof nothing {
  let label: string;
  let arc: TemplateResult | typeof nothing = nothing;
  if (m.stopped) {
    label = m.stopped.label;
  } else if (m.recovery) {
    const length = ((m.recovery.value / 100) * RING).toFixed(1);
    label = S.ringLabel(m.recovery.value);
    arc = svg`<circle class="ring-arc" cx="36" cy="36" r="30"
      stroke-dasharray="${length} ${String(RING)}" transform="rotate(-90 36 36)"></circle>`;
  } else {
    return nothing;
  }
  return html`<div class="ring">
    <svg viewBox="0 0 72 72" role="img" aria-label=${label}>
      <circle class="ring-track" cx="36" cy="36" r="30"></circle>
      ${arc}
    </svg>
    <div class="ring-center">${renderRecovery(m, ctx, 20)}</div>
  </div>`;
}

function strip(m: CardModel, ctx: RenderCtx): TemplateResult {
  return html`<div class="strip">
    ${STRIP.map(
      ([key, side]) =>
        html`<div class="cell cell--${side}">
          <span class="cell-label">${S[key]}</span>${renderTemp(m, key, ctx)}
        </div>`,
    )}
  </div>`;
}

function meter(
  label: TemplateResult | string,
  entity: string,
  value: string,
  bar: TemplateResult | typeof nothing,
  ctx: RenderCtx,
  valueClass = '',
): TemplateResult {
  return html`<div class="meter">
    <div class="meter-head">
      <span class="meter-label">${label}</span>
      ${tappable(entity, ctx, html`<span class="meter-value ${valueClass}">${value}</span>`)}
    </div>
    ${bar}
  </div>`;
}

function fanMeter(label: string, fan: FanValue | undefined, ctx: RenderCtx) {
  return fan
    ? meter(label, fan.entity, fan.display, renderBar(fan.level, '--hru-accent'), ctx)
    : nothing;
}

function filterMeter(f: FilterView | null, ctx: RenderCtx) {
  if (!f) return nothing;
  const hasLevel = f.level !== null;
  return meter(
    html`<ha-icon icon="mdi:air-filter"></ha-icon>${hasLevel ? S.filterClogging : S.filter}`,
    f.entity,
    hasLevel ? `${String(f.level)}%` : f.label,
    hasLevel ? renderBar(f.level, SEVERITY_COLOR[f.severity]) : nothing,
    ctx,
    `sev--${f.severity}`,
  );
}

function meters(m: CardModel, ctx: RenderCtx): TemplateResult | typeof nothing {
  if (!m.fans.supply && !m.fans.extract && !m.filter) return nothing;
  return html`<div class="meters">
    ${fanMeter(S.supplyFan, m.fans.supply, ctx)} ${fanMeter(S.extractFan, m.fans.extract, ctx)}
    ${filterMeter(m.filter, ctx)}
  </div>`;
}

function extraText(x: Extra): string {
  const suffix = S.extraSuffix[x.key];
  return suffix ? `${x.display} ${suffix}` : x.display;
}

function extrasLine(m: CardModel, ctx: RenderCtx): TemplateResult | typeof nothing {
  if (m.extras.length === 0) return nothing;
  return html`<div class="extras-line">
    ${m.extras.map((x) => tappable(x.entity, ctx, html`<span>${extraText(x)}</span>`))}
  </div>`;
}

export function renderCompact(m: CardModel, ctx: RenderCtx): TemplateResult {
  return html`${renderHeader(m, ctx, { compact: true })}
    <div class="top">${hero(m, ctx)} ${ring(m, ctx)}</div>
    ${strip(m, ctx)} ${meters(m, ctx)} ${renderChips(m.chips, null, ctx)} ${extrasLine(m, ctx)}`;
}

export const compactStyles = css`
  .top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 14px;
  }
  .hero {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .hero-label,
  .hero-sub {
    font-size: 13px;
    color: var(--hru-muted);
  }
  .hero-value {
    font-size: 44px;
    font-weight: 400;
    line-height: 1.1;
  }
  .ring {
    position: relative;
    flex: none;
    width: 72px;
    height: 72px;
  }
  .ring svg {
    width: 72px;
    height: 72px;
  }
  .ring-track,
  .ring-arc {
    fill: none;
    stroke-width: 6;
  }
  .ring-track {
    stroke: var(--hru-track);
  }
  .ring-arc {
    stroke: var(--hru-accent);
    stroke-linecap: round;
  }
  .ring-center {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .ring-center .pct {
    font-size: 16px;
    font-weight: 500;
  }
  .ring-center .label {
    font-size: 10px;
  }
  .strip {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px;
    margin-bottom: 14px;
  }
  .cell {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px;
    border-radius: 8px;
    background: var(--hru-tile);
  }
  .cell-label {
    font-size: 11px;
  }
  .cell--cool .cell-label {
    color: var(--hru-cool-text);
  }
  .cell--warm .cell-label {
    color: var(--hru-warm-text);
  }
  .cell .temp {
    font-size: 15px;
    font-weight: 500;
  }
  .meters {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 14px;
  }
  .meter {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .meter-head {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
  }
  .meter-label {
    display: flex;
    align-items: center;
    gap: 4px;
    color: var(--hru-muted);
    --mdc-icon-size: 14px;
  }
  .meter .bar {
    height: 4px;
  }
  .extras-line {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 4px 12px;
    margin-top: 14px;
    padding-top: 12px;
    border-top: 1px solid var(--hru-border);
    font-size: 12px;
    color: var(--hru-muted);
  }
`;
