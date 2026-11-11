import { css, html, nothing, type TemplateResult } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { styleMap } from 'lit/directives/style-map.js';
import { S } from '../strings';
import type { CardModel, Chip, FilterView, RenderCtx, TempKey } from '../types';

const FILTER_ICON = 'mdi:air-filter';

/** Bar colour token per filter severity. */
export const SEVERITY_COLOR: Record<FilterView['severity'], string> = {
  ok: '--hru-ok',
  warning: '--hru-warn',
  critical: '--hru-bad',
};

/** Any entity-backed value: a reset button that opens the entity's more-info dialog. */
export function tappable(entity: string, ctx: RenderCtx, content: TemplateResult): TemplateResult {
  return html`<button
    class="value"
    type="button"
    @click=${() => {
      ctx.moreInfo(entity);
    }}
  >
    ${content}
  </button>`;
}

/** A temperature value: tappable when mapped, a plain dash when the role is unmapped. */
export function renderTemp(m: CardModel, key: TempKey, ctx: RenderCtx): TemplateResult {
  const t = m.temps[key];
  return t
    ? tappable(t.entity, ctx, html`<span class="temp">${t.display}</span>`)
    : html`<span class="temp">${S.noValue}</span>`;
}

/** Recovery spot: stopped state, or percentage + label (tappable when from a sensor). */
export function renderRecovery(
  m: CardModel,
  ctx: RenderCtx,
  stoppedIconSize: number,
): TemplateResult | typeof nothing {
  if (m.stopped) return renderStopped(m, stoppedIconSize);
  const r = m.recovery;
  if (!r) return nothing;
  const pct = html`<span class="pct">${r.approx ? '≈' : ''}${String(r.value)}%</span>`;
  return html`${r.entity ? tappable(r.entity, ctx, pct) : pct}
    <span class="label">${S.recovery}</span>`;
}

/**
 * Subtitle line (flow, lanes). '' while running still renders the line: its CSS min-height keeps
 * the header height steady on start/stop. null (unit can never stop) or compact: no line.
 */
function renderSubtitle(m: CardModel, compact: boolean): TemplateResult | typeof nothing {
  if (compact || m.subtitle === null) return nothing;
  return html`<div class="subtitle">${m.subtitle}</div>`;
}

export function renderHeader(
  m: CardModel,
  ctx: RenderCtx,
  opts: { compact?: boolean } = {},
): TemplateResult {
  const mode = m.mode;
  const compact = opts.compact === true;
  return html`<div class=${classMap({ header: true, 'header--compact': compact })}>
    <div class="bubble">
      <ha-icon class="spin" data-motion="spin" icon=${m.icon}></ha-icon>
    </div>
    <div class="title">
      <div class="name">${m.name}</div>
      ${renderSubtitle(m, compact)}
    </div>
    ${
      mode
        ? html`<button
            class="pill value"
            type="button"
            @click=${() => {
              ctx.moreInfo(mode.entity);
            }}
          >
            ${mode.label}
          </button>`
        : nothing
    }
  </div>`;
}

function chipButton(
  entity: string,
  icon: string,
  label: string,
  classes: Record<string, boolean>,
  ctx: RenderCtx,
): TemplateResult {
  return html`<button
    class=${classMap({ chip: true, ...classes })}
    type="button"
    @click=${() => {
      ctx.moreInfo(entity);
    }}
  >
    <ha-icon icon=${icon}></ha-icon><span>${label}</span>
  </button>`;
}

export function renderChips(
  chips: Chip[],
  filter: CardModel['filter'] | null,
  ctx: RenderCtx,
): TemplateResult | typeof nothing {
  if (chips.length === 0 && !filter) return nothing;
  return html`<div class="chips">
    ${chips.map((c) =>
      chipButton(
        c.entity,
        c.icon,
        c.label,
        {
          'chip--active-warm': c.active && c.kind === 'heater',
          'chip--active-cool': c.active && c.kind !== 'heater',
        },
        ctx,
      ),
    )}
    ${
      filter
        ? chipButton(
            filter.entity,
            FILTER_ICON,
            filter.label,
            { [`chip--${filter.severity}`]: true },
            ctx,
          )
        : nothing
    }
  </div>`;
}

export function renderStopped(m: CardModel, size: number): TemplateResult | typeof nothing {
  if (!m.stopped) return nothing;
  return html`<div class="stopped">
    <ha-icon
      icon=${m.stopped.icon}
      style=${styleMap({ '--mdc-icon-size': `${String(size)}px` })}
    ></ha-icon>
    <span class="stopped-label">${m.stopped.label}</span>
  </div>`;
}

export function renderBar(level: number | null, cssColorVar: string): TemplateResult {
  return html`<div
    class="bar"
    role="progressbar"
    aria-valuemin="0"
    aria-valuemax="100"
    aria-valuenow=${ifDefined(level === null ? undefined : String(level))}
  >
    <div
      class="bar-fill"
      style=${styleMap({ width: `${String(level ?? 0)}%`, background: `var(${cssColorVar})` })}
    ></div>
  </div>`;
}

export const sharedStyles = css`
  ha-card {
    display: block;
    padding: 16px;
    border-radius: var(--ha-card-border-radius, 12px);
    background: var(--hru-card);
    color: var(--hru-text);
    box-sizing: border-box;
  }
  .header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  }
  .header--compact {
    gap: 10px;
    margin-bottom: 12px;
  }
  .bubble {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: none;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--hru-accent-tint);
    color: var(--hru-accent-text);
    --mdc-icon-size: 22px;
  }
  .header--compact .bubble {
    width: 36px;
    height: 36px;
    --mdc-icon-size: 20px;
  }
  .header--compact .name {
    font-size: 15px;
  }
  .header--compact .pill {
    font-size: 12px;
    padding: 5px 10px;
  }
  .spin {
    display: inline-flex;
  }
  .title {
    flex: 1;
    min-width: 0;
  }
  .name {
    font-size: 16px;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .subtitle {
    font-size: 13px;
    line-height: 18px;
    min-height: 18px;
    color: var(--hru-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  :where(button.value) {
    all: unset;
    cursor: pointer;
    border-radius: 6px;
  }
  button.value:focus-visible,
  button.chip:focus-visible {
    outline: 2px solid var(--hru-accent);
    outline-offset: 2px;
  }
  .pill {
    flex: none;
    font-size: 13px;
    padding: 4px 12px;
    border-radius: 16px;
    background: var(--hru-accent-tint);
    color: var(--hru-accent-text);
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  :where(button.chip) {
    all: unset;
  }
  .chip {
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    padding: 6px 10px;
    border-radius: 16px;
    background: var(--hru-chip);
    color: var(--hru-chip-text);
    --mdc-icon-size: 16px;
  }
  .chip--active-cool {
    background: var(--hru-cool-tint);
    color: var(--hru-cool-text);
  }
  .chip--active-warm {
    background: var(--hru-warm-tint);
    color: var(--hru-warm-text);
  }
  .chip--ok {
    background: var(--hru-ok-tint);
    color: var(--hru-ok-text);
  }
  .chip--warning {
    background: var(--hru-warn-tint);
    color: var(--hru-warn-text);
  }
  .chip--critical {
    background: var(--hru-bad-tint);
    color: var(--hru-bad-text);
  }
  .sev--ok {
    color: var(--hru-ok-text);
  }
  .sev--warning {
    color: var(--hru-warn-text);
  }
  .sev--critical {
    color: var(--hru-bad-text);
  }
  .label {
    font-size: 12px;
    color: var(--hru-muted);
  }
  .stopped {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    color: var(--hru-muted);
  }
  .stopped-label {
    font-size: 12px;
  }
  .bar {
    height: 6px;
    border-radius: 3px;
    background: var(--hru-track);
    overflow: hidden;
  }
  .bar-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.6s ease;
  }
`;
