export type Layout = 'flow' | 'lanes' | 'compact';
export type ThemeMode = 'auto' | 'light' | 'dark';
export type SpeedBand = 'off' | 'low' | 'medium' | 'high' | 'max';

export interface HruCardConfig {
  type: string;
  layout?: Layout;
  name?: string;
  icon?: string;
  theme?: ThemeMode;
  accent?: string;
  animations?: boolean;
  intake_temp?: string;
  supply_temp?: string;
  extract_temp?: string;
  exhaust_temp?: string;
  target_temp?: string;
  supply_fan?: string;
  extract_fan?: string;
  max_rpm?: number;
  mode?: string;
  mode_speeds?: Record<string, SpeedBand>;
  efficiency?: string;
  filter?: string;
  filter_limit?: number;
  filter_warning?: number;
  filter_critical?: number;
  bypass?: string;
  heater?: string;
  defrost?: string;
  recovered_power?: string;
  power?: string;
  humidity?: string;
  co2?: string;
  airflow?: string;
}

export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
}

export interface HomeAssistant {
  states: Record<string, HassEntity>;
  locale?: { language: string };
  language?: string;
  formatEntityState?: (entity: HassEntity, state?: string) => string;
  /** HA 2026.4+: compose a display name from registry context. */
  formatEntityName?: (
    entity: HassEntity,
    items: { type: 'entity' | 'device' | 'area' | 'floor' }[],
    options?: { separator?: string },
  ) => string;
  themes?: { darkMode?: boolean };
  /** Entity registry (subset). */
  entities?: Record<string, { entity_id: string; device_id?: string | null }>;
}

export type TempKey = 'intake' | 'supply' | 'extract' | 'exhaust';

export interface TempValue {
  key: TempKey;
  entity: string;
  value: number | null;
  display: string;
  label: string;
}

export interface FanValue {
  entity: string;
  level: number | null;
  display: string;
  rpm: string | null;
}

export interface Chip {
  kind: 'bypass' | 'heater' | 'defrost';
  entity: string;
  active: boolean;
  icon: string;
  label: string;
}

export type ExtraKey = 'recovered_power' | 'power' | 'humidity' | 'co2' | 'airflow';

export interface Extra {
  key: ExtraKey;
  entity: string;
  label: string;
  display: string;
}

export interface FilterView {
  entity: string;
  level: number | null;
  severity: 'ok' | 'warning' | 'critical';
  label: string;
}

/** Seconds per animation cycle; null = paused. */
export interface Motion {
  supply: number | null;
  extract: number | null;
  spin: number | null;
}

export interface CardModel {
  name: string;
  icon: string;
  subtitle: string;
  mode: { entity: string; label: string } | null;
  running: boolean;
  stopped: { label: string; icon: string } | null;
  temps: Partial<Record<TempKey, TempValue>>;
  tempCount: number;
  fans: { supply?: FanValue; extract?: FanValue };
  motion: Motion;
  /** `entity` is the efficiency sensor when the value came from it, else null. */
  recovery: { value: number; approx: boolean; entity: string | null } | null;
  filter: FilterView | null;
  chips: Chip[];
  extras: Extra[];
  /** Compact layout's big supply-air reading; always supply, "—" when missing. */
  hero: {
    label: string;
    display: string;
    /** Small line under the value; `entity` makes it tappable (the target temperature). */
    sub: { text: string; entity: string | null } | null;
  };
  /** Target (set-point) temperature; null when `target_temp` is not mapped. */
  target: { entity: string; display: string } | null;
}

export interface RenderCtx {
  moreInfo: (entityId: string) => void;
}
