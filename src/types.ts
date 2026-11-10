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
  themes?: { darkMode?: boolean };
}
