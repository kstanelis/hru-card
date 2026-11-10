import { LitElement, css, html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';
import {
  ROLE_DOMAINS,
  countTemps,
  matchRoles,
  validateConfig,
  withDefaults,
  type ResolvedConfig,
} from './config';
import { MotionController } from './motion';
import { buildModel } from './model/build';
import { flowStyles, renderFlow } from './render/flow';
import { sharedStyles } from './render/shared';
import { S } from './strings';
import { themeVars } from './theme';
import type { CardModel, HomeAssistant, HruCardConfig, Layout, RenderCtx } from './types';

export interface EntitySuggestion {
  label: string;
  config: HruCardConfig;
}

interface CustomCardEntry {
  type: string;
  name: string;
  description: string;
  preview: boolean;
  getEntitySuggestion?: (hass: HomeAssistant, entityId: string) => EntitySuggestion | null;
}

declare global {
  interface Window {
    customCards?: CustomCardEntry[];
  }
  interface HTMLElementTagNameMap {
    'hru-card': HruCard;
    'ha-card': HTMLElement;
  }
}

const CARD_SIZE: Record<Layout, number> = { flow: 6, lanes: 7, compact: 4 };

type LayoutRenderer = (model: CardModel, ctx: RenderCtx) => TemplateResult;

/** Layout renderers; each layout task registers its own. */
const RENDERERS: Partial<Record<Layout, LayoutRenderer>> = { flow: renderFlow };

/** HA 2026.6+ card picker: suggest this card for an entity on an HRU-looking device. */
export function getEntitySuggestion(
  hass: HomeAssistant,
  entityId: string,
): EntitySuggestion | null {
  const device = hass.entities?.[entityId]?.device_id;
  if (!device || !hass.entities) return null;
  const siblings = Object.values(hass.entities)
    .filter((e) => e.device_id === device)
    .map((e) => e.entity_id);
  const matched = matchRoles(hass, siblings);
  if (countTemps(matched) < 2) return null;
  return { label: S.cardName, config: { type: 'custom:hru-card', ...matched } };
}

@customElement('hru-card')
export class HruCard extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private config?: ResolvedConfig;
  private warned = new Set<string>();
  private readonly motion = new MotionController(this);
  private model?: CardModel;

  static getConfigElement(): HTMLElement {
    return document.createElement('hru-card-editor');
  }

  static getStubConfig(hass: HomeAssistant): HruCardConfig {
    return {
      type: 'custom:hru-card',
      layout: 'flow',
      ...matchRoles(hass, Object.keys(hass.states)),
    };
  }

  setConfig(config: HruCardConfig): void {
    const { errors, warnings } = validateConfig(config);
    if (errors.length) throw new Error(errors.join('\n'));
    for (const w of warnings) {
      if (this.warned.has(w)) continue;
      this.warned.add(w);
      console.warn(`hru-card: ${w}`);
    }
    this.config = withDefaults(config);
  }

  getCardSize(): number {
    return CARD_SIZE[this.layout];
  }

  /** Sections grid, HA 2024.11+. */
  getGridOptions(): { columns: number; min_columns: number } {
    return this.layout === 'compact'
      ? { columns: 6, min_columns: 6 }
      : { columns: 12, min_columns: 9 };
  }

  /** Sections grid, HA 2024.8–2024.10 (4-column). */
  getLayoutOptions(): { grid_columns: number; grid_min_columns: number } {
    return this.layout === 'compact'
      ? { grid_columns: 2, grid_min_columns: 2 }
      : { grid_columns: 4, grid_min_columns: 3 };
  }

  private get layout(): Layout {
    return this.config?.layout ?? 'flow';
  }

  private get entityIds(): string[] {
    const cfg = this.config;
    if (!cfg) return [];
    return Object.keys(ROLE_DOMAINS)
      .map((k) => cfg[k as keyof HruCardConfig])
      .filter((v): v is string => typeof v === 'string' && v !== '');
  }

  protected override shouldUpdate(changed: PropertyValues): boolean {
    if (!changed.has('hass') || changed.size > 1) return true;
    const old = changed.get('hass') as HomeAssistant | undefined;
    const hass = this.hass;
    if (!old || !hass) return true;
    if (old.themes?.darkMode !== hass.themes?.darkMode) return true;
    return this.entityIds.some((id) => old.states[id] !== hass.states[id]);
  }

  protected moreInfo(entityId: string): void {
    this.dispatchEvent(
      new CustomEvent('hass-more-info', { detail: { entityId }, bubbles: true, composed: true }),
    );
  }

  private readonly ctx: RenderCtx = {
    moreInfo: (id) => {
      this.moreInfo(id);
    },
  };

  protected override render(): TemplateResult | typeof nothing {
    const { config, hass } = this;
    if (!config || !hass) return nothing;
    const model = buildModel(hass, config);
    this.model = model;
    const vars = themeVars(config.theme, config.accent, hass.themes?.darkMode ?? false);
    return html`<ha-card
      style=${styleMap(vars)}
      class=${classMap({ 'no-motion': !config.animations, [config.layout]: true })}
    >
      ${
        model.tempCount < 2
          ? html`<div class="hint">${S.mapTwoTemps}</div>`
          : (RENDERERS[config.layout]?.(model, this.ctx) ?? nothing)
      }
    </ha-card>`;
  }

  protected override updated(): void {
    const { model, config, shadowRoot } = this;
    if (!model || !config || !shadowRoot) return;
    this.motion.sync(shadowRoot, model.motion, config.animations);
  }

  static override styles = [
    sharedStyles,
    flowStyles,
    css`
      :host {
        display: block;
      }
      ha-card {
        background: var(--hru-card);
        color: var(--hru-text);
        border-radius: var(--ha-card-border-radius, 12px);
        overflow: hidden;
      }
      .hint {
        color: var(--hru-muted);
        font-size: 14px;
      }
    `,
  ];
}

window.customCards = window.customCards ?? [];
if (!window.customCards.some((c) => c.type === 'hru-card')) {
  window.customCards.push({
    type: 'hru-card',
    name: S.cardName,
    description: S.cardDescription,
    preview: true,
    getEntitySuggestion,
  });
}
