import { css, html, nothing, svg, unsafeCSS, type TemplateResult } from 'lit';
import { S } from '../strings';
import type { CardModel, Extra, FanValue, FilterView, RenderCtx, TempKey } from '../types';
import {
  renderBar,
  renderChips,
  renderHeader,
  renderRecovery,
  renderTarget,
  renderTemp,
  SEVERITY_COLOR,
  tappable,
} from './shared';

/** Extras that come before the filter tile; the rest follow it. */
const BEFORE_FILTER = new Set<Extra['key']>(['recovered_power', 'power']);

const arrowRight = svg`<path d="M2 8h22M18 2l6 6-6 6"></path>`;
const arrowLeft = svg`<path d="M26 8H4M10 2L4 8l6 6"></path>`;

function arrow(motion: 'supply' | 'extract', dir: 'right' | 'left'): TemplateResult {
  return html`<svg
    class="arrow"
    data-motion=${motion}
    data-dir=${dir}
    viewBox="0 0 28 16"
    aria-hidden="true"
  >
    ${dir === 'right' ? arrowRight : arrowLeft}
  </svg>`;
}

function fanLine(fan: FanValue | undefined): TemplateResult | typeof nothing {
  if (!fan) return nothing;
  const text = S.fanText(fan.display) + (fan.rpm ? `${S.separator}${fan.rpm}` : '');
  return html`<span class="sub">${text}</span>`;
}

function box(
  m: CardModel,
  key: TempKey,
  side: 'cool' | 'warm',
  ctx: RenderCtx,
  sub: TemplateResult | typeof nothing,
): TemplateResult {
  return html`<div class="box box--${key} box--${side}">
    <span class="box-label">${S[key]}</span>
    ${renderTemp(m, key, ctx)} ${sub}
  </div>`;
}

function extraTile(x: Extra, ctx: RenderCtx): TemplateResult {
  return html`<div class="tile">
    <span class="label">${x.label}</span>
    ${tappable(x.entity, ctx, html`<span class="tile-value">${x.display}</span>`)}
  </div>`;
}

function filterTile(f: FilterView, ctx: RenderCtx): TemplateResult {
  const value = f.level === null ? f.label : `${String(f.level)}%`;
  return html`<div class="tile tile--filter">
    <span class="label"><ha-icon icon="mdi:air-filter"></ha-icon>${S.filter}</span>
    ${tappable(f.entity, ctx, html`<span class="tile-value sev--${f.severity}">${value}</span>`)}
    ${f.level === null ? nothing : renderBar(f.level, SEVERITY_COLOR[f.severity])}
  </div>`;
}

function tiles(m: CardModel, ctx: RenderCtx): TemplateResult | typeof nothing {
  const before = m.extras.filter((x) => BEFORE_FILTER.has(x.key));
  const after = m.extras.filter((x) => !BEFORE_FILTER.has(x.key));
  if (m.extras.length === 0 && !m.filter) return nothing;
  return html`<div class="tiles">
    ${before.map((x) => extraTile(x, ctx))} ${m.filter ? filterTile(m.filter, ctx) : nothing}
    ${after.map((x) => extraTile(x, ctx))}
  </div>`;
}

export function renderLanes(m: CardModel, ctx: RenderCtx): TemplateResult {
  return html`<div class="lanes-root">
    ${renderHeader(m, ctx)}
    <div class="lanes-grid">
      ${box(m, 'intake', 'cool', ctx, html`<span class="sub">${S.freshAirIn}</span>`)}
      <div class="middle">
        ${arrow('supply', 'right')}
        <div class="recovery">${renderRecovery(m, ctx, 24)} ${renderTarget(m, ctx)}</div>
        ${arrow('extract', 'left')}
      </div>
      ${box(m, 'supply', 'warm', ctx, fanLine(m.fans.supply))}
      ${box(m, 'exhaust', 'cool', ctx, html`<span class="sub">${S.staleAirOut}</span>`)}
      ${box(m, 'extract', 'warm', ctx, fanLine(m.fans.extract))}
    </div>
    ${tiles(m, ctx)} ${renderChips(m.chips, null, ctx)}
  </div>`;
}

/**
 * Narrow cards (< 360 px) stack the lanes in one column. Kept as a plain string because
 * lit-analyzer's CSS validator predates container queries and flags valid syntax.
 */
const NARROW = unsafeCSS(`
  .lanes-root {
    container-type: inline-size;
  }
  @container (max-width: 359px) {
    .lanes-grid {
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: none;
    }
    .lanes-grid > * {
      grid-area: auto;
    }
    .box--warm {
      align-items: flex-start;
    }
    .middle {
      flex-direction: row;
      padding: 8px 14px;
    }
    .tiles {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
`);

const wide = css`
  .lanes-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 92px minmax(0, 1fr);
    grid-template-rows: auto auto;
    gap: 8px;
    margin-bottom: 14px;
  }
  .box {
    border-radius: 10px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .box--cool {
    background: var(--hru-cool-tint);
  }
  .box--warm {
    background: var(--hru-warm-tint);
    align-items: flex-end;
  }
  .box--intake {
    grid-area: 1 / 1;
  }
  .box--exhaust {
    grid-area: 2 / 1;
  }
  .box--supply {
    grid-area: 1 / 3;
  }
  .box--extract {
    grid-area: 2 / 3;
  }
  .box-label {
    font-size: 12px;
  }
  .box--cool .box-label {
    color: var(--hru-cool-text);
  }
  .box--warm .box-label {
    color: var(--hru-warm-text);
  }
  .box .temp {
    font-size: 24px;
    font-weight: 500;
  }
  .sub {
    font-size: 12px;
    color: var(--hru-muted);
  }
  .middle {
    grid-area: 1 / 2 / 3 / 3;
    background: var(--hru-chip);
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    padding: 14px 0;
    color: var(--hru-chip-text);
  }
  .arrow {
    width: 28px;
    height: 16px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .recovery {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .pct {
    font-size: 22px;
    font-weight: 500;
    color: var(--hru-text);
  }
  .recovery .label {
    font-size: 11px;
  }
  .tiles {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    margin-bottom: 14px;
  }
  .tile {
    background: var(--hru-tile);
    border-radius: 10px;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .tile .label {
    display: flex;
    align-items: center;
    gap: 4px;
    --mdc-icon-size: 14px;
  }
  .tile-value {
    font-size: 18px;
    font-weight: 500;
  }
  .tile .bar {
    height: 4px;
  }
`;

export const lanesStyles = [wide, NARROW];
