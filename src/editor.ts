import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { DEFAULTS } from './config';
import { buildSchema, computeLabel } from './editor-schema';
import type { HomeAssistant, HruCardConfig } from './types';

const SCHEMA = buildSchema();
const DEFAULT_VALUES: Partial<Record<string, unknown>> = DEFAULTS;

/** Empty fields and values equal to their default are left out of the saved config. */
function keep(key: string, value: unknown): boolean {
  return value !== '' && value !== undefined && value !== null && value !== DEFAULT_VALUES[key];
}

/**
 * Visual editor: HA's ha-form over the flat card config. The form shows defaults; keys
 * outside the schema (e.g. mode_speeds) pass through untouched.
 */
@customElement('hru-card-editor')
export class HruCardEditor extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private config?: HruCardConfig;

  setConfig(config: HruCardConfig): void {
    this.config = config;
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this.hass || !this.config) return nothing;
    return html`<ha-form
      .hass=${this.hass}
      .data=${{ ...DEFAULTS, ...this.config }}
      .schema=${SCHEMA}
      .computeLabel=${computeLabel}
      @value-changed=${this.valueChanged}
    ></ha-form>`;
  }

  private readonly valueChanged = (ev: CustomEvent<{ value: Record<string, unknown> }>): void => {
    ev.stopPropagation();
    const config = Object.fromEntries(
      Object.entries(ev.detail.value).filter(([k, v]) => keep(k, v)),
    ) as unknown as HruCardConfig;
    this.config = config;
    this.dispatchEvent(
      new CustomEvent('config-changed', { detail: { config }, bubbles: true, composed: true }),
    );
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'hru-card-editor': HruCardEditor;
  }
}
