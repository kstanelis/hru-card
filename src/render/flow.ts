import { css, html, nothing, svg, type TemplateResult } from 'lit';
import { S } from '../strings';
import type { CardModel, FanValue, RenderCtx, TempKey } from '../types';
import {
  renderChips,
  renderHeader,
  renderRecovery,
  renderTarget,
  renderTemp,
  tappable,
} from './shared';

const SUPPLY_PATH = 'M 20 60 C 170 60, 268 180, 418 180';
const EXTRACT_PATH = 'M 418 60 C 268 60, 170 180, 20 180';

const ducts = svg`
  <defs>
    <linearGradient id="duct" x1="20" y1="0" x2="418" y2="0" gradientUnits="userSpaceOnUse">
      <stop class="stop-cool" offset="0"></stop>
      <stop class="stop-warm" offset="1"></stop>
    </linearGradient>
  </defs>
  <path class="duct" d=${SUPPLY_PATH}></path>
  <path class="duct" d=${EXTRACT_PATH}></path>
  <path class="dots" data-motion="supply" d=${SUPPLY_PATH}></path>
  <path class="dots" data-motion="extract" d=${EXTRACT_PATH}></path>
`;

function caption(key: TempKey, fan: FanValue | undefined): string {
  return fan ? `${S[key]}${S.separator}${S.fanText(fan.display)}` : S[key];
}

function corner(
  m: CardModel,
  key: TempKey,
  ctx: RenderCtx,
  fan?: FanValue,
  labelFirst = true,
): TemplateResult {
  const label = html`<span class="label">${caption(key, fan)}</span>`;
  const value = renderTemp(m, key, ctx);
  return html`<div class="corner corner--${key}">
    ${labelFirst ? html`${label}${value}` : html`${value}${label}`}
  </div>`;
}

function badge(m: CardModel, ctx: RenderCtx): TemplateResult | typeof nothing {
  const content = renderRecovery(m, ctx, 26);
  return content === nothing ? nothing : html`<div class="badge">${content}</div>`;
}

function extras(m: CardModel, ctx: RenderCtx): TemplateResult | typeof nothing {
  if (m.extras.length === 0) return nothing;
  return html`<div class="extras">
    ${m.extras.map(
      (x) =>
        html`<div class="extra">
          <span class="label">${x.label}</span>
          ${tappable(x.entity, ctx, html`<span class="extra-value">${x.display}</span>`)}
        </div>`,
    )}
  </div>`;
}

export function renderFlow(m: CardModel, ctx: RenderCtx): TemplateResult {
  return html`${renderHeader(m, ctx)}
    <div class="diagram">
      <svg viewBox="0 0 438 240" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        ${ducts}
      </svg>
      ${corner(m, 'intake', ctx)} ${corner(m, 'extract', ctx)}
      ${corner(m, 'exhaust', ctx, m.fans.extract, false)}
      ${corner(m, 'supply', ctx, m.fans.supply, false)} ${badge(m, ctx)} ${renderTarget(m, ctx)}
    </div>
    ${renderChips(m.chips, m.filter, ctx)} ${extras(m, ctx)}`;
}

export const flowStyles = css`
  .diagram {
    position: relative;
    height: 240px;
    margin-bottom: 16px;
  }
  .diagram svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  .stop-cool {
    stop-color: var(--hru-cool);
  }
  .stop-warm {
    stop-color: var(--hru-warm);
  }
  .duct {
    fill: none;
    stroke: url(#duct);
    stroke-width: 24;
    stroke-linecap: round;
    opacity: 0.85;
  }
  .dots {
    fill: none;
    stroke: #ffffff;
    stroke-opacity: 0.55;
    stroke-width: 3;
    stroke-linecap: round;
    stroke-dasharray: 2 14;
  }
  .corner {
    position: absolute;
    display: flex;
    flex-direction: column;
  }
  .corner--intake {
    left: 4px;
    top: 0;
  }
  .corner--extract {
    right: 4px;
    top: 0;
    align-items: flex-end;
  }
  .corner--exhaust {
    left: 4px;
    bottom: 0;
  }
  .corner--supply {
    right: 4px;
    bottom: 0;
    align-items: flex-end;
  }
  .temp {
    font-size: 22px;
    font-weight: 500;
  }
  .badge {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 88px;
    height: 88px;
    box-sizing: border-box;
    border-radius: 50%;
    background: var(--hru-card);
    border: 2px solid var(--hru-track);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .pct {
    font-size: 22px;
    font-weight: 500;
  }
  .diagram > .target {
    position: absolute;
    left: 50%;
    top: calc(50% + 50px);
    transform: translateX(-50%);
  }
  .badge .label {
    font-size: 11px;
  }
  .extras {
    margin-top: 16px;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
    border-top: 1px solid var(--hru-border);
    padding-top: 14px;
  }
  .extra {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .extra-value {
    font-size: 18px;
    font-weight: 500;
  }
`;
