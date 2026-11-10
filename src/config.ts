import { FILTER_CRITICAL, FILTER_WARNING } from './model/filter';
import { S } from './strings';
import type { HruCardConfig, Layout, SpeedBand, ThemeMode } from './types';

export const LAYOUTS: readonly Layout[] = ['flow', 'lanes', 'compact'];
export const THEMES: readonly ThemeMode[] = ['auto', 'light', 'dark'];
export const SPEED_BANDS: readonly SpeedBand[] = ['off', 'low', 'medium', 'high', 'max'];

/** Defaults filled by withDefaults. `name` is absent on purpose: buildModel derives it. */
export const DEFAULTS = {
  layout: 'flow',
  icon: S.defaultIcon,
  theme: 'auto',
  animations: true,
  max_rpm: 3000,
  filter_warning: FILTER_WARNING,
  filter_critical: FILTER_CRITICAL,
} as const satisfies Partial<HruCardConfig>;

export type EntityRole =
  | 'intake_temp'
  | 'supply_temp'
  | 'extract_temp'
  | 'exhaust_temp'
  | 'supply_fan'
  | 'extract_fan'
  | 'mode'
  | 'efficiency'
  | 'filter'
  | 'bypass'
  | 'heater'
  | 'defrost'
  | 'recovered_power'
  | 'power'
  | 'humidity'
  | 'co2'
  | 'airflow';

/** Accepted entity domains per role (spec §5). */
export const ROLE_DOMAINS: Record<EntityRole, string[]> = {
  intake_temp: ['sensor'],
  supply_temp: ['sensor'],
  extract_temp: ['sensor'],
  exhaust_temp: ['sensor'],
  supply_fan: ['sensor', 'fan', 'number'],
  extract_fan: ['sensor', 'fan', 'number'],
  mode: ['select', 'input_select', 'fan', 'climate', 'sensor'],
  efficiency: ['sensor'],
  filter: ['sensor', 'binary_sensor'],
  bypass: ['binary_sensor', 'sensor', 'switch'],
  heater: ['binary_sensor', 'switch', 'sensor'],
  defrost: ['binary_sensor', 'switch', 'sensor'],
  recovered_power: ['sensor'],
  power: ['sensor'],
  humidity: ['sensor'],
  co2: ['sensor'],
  airflow: ['sensor'],
};

export const TEMP_ROLES: readonly EntityRole[] = [
  'intake_temp',
  'supply_temp',
  'extract_temp',
  'exhaust_temp',
];

const TEXT_KEYS = ['name', 'icon', 'accent'] as const;
const NUMBER_KEYS = ['max_rpm', 'filter_limit', 'filter_warning', 'filter_critical'] as const;
const KNOWN_KEYS = new Set<string>([
  'type',
  'layout',
  'theme',
  'animations',
  'mode_speeds',
  ...TEXT_KEYS,
  ...NUMBER_KEYS,
  ...Object.keys(ROLE_DOMAINS),
]);
const ENTITY_ID = /^[a-z_]+\.\w+$/;

export interface ValidationResult {
  errors: string[];
  warnings: string[];
}

const isSet = (v: unknown): boolean => v !== undefined && v !== null && v !== '';

function listDomains(domains: string[]): string {
  const head = domains.slice(0, -1);
  const last = domains.slice(-1).join('');
  return head.length ? `${head.join(', ')} or ${last}` : last;
}

export function validateConfig(c: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (typeof c !== 'object' || c === null || Array.isArray(c)) {
    return { errors: ['config must be a mapping'], warnings };
  }
  const cfg = c as Record<string, unknown>;

  for (const key of Object.keys(cfg)) {
    if (!KNOWN_KEYS.has(key)) warnings.push(`${key}: unknown option`);
  }

  const oneOf = (key: string, allowed: readonly string[]): void => {
    const v = cfg[key];
    if (isSet(v) && !allowed.includes(v as string)) {
      errors.push(`${key}: expected one of ${allowed.join(', ')}, got ${String(v)}`);
    }
  };
  oneOf('layout', LAYOUTS);
  oneOf('theme', THEMES);

  for (const key of TEXT_KEYS) {
    if (isSet(cfg[key]) && typeof cfg[key] !== 'string') errors.push(`${key}: expected text`);
  }
  if (isSet(cfg.animations) && typeof cfg.animations !== 'boolean') {
    errors.push('animations: expected true or false');
  }

  for (const key of NUMBER_KEYS) {
    const v = cfg[key];
    if (isSet(v) && !(typeof v === 'number' && Number.isFinite(v) && v > 0)) {
      errors.push(`${key}: expected a positive number`);
    }
  }
  const warning = typeof cfg.filter_warning === 'number' ? cfg.filter_warning : FILTER_WARNING;
  const critical = typeof cfg.filter_critical === 'number' ? cfg.filter_critical : FILTER_CRITICAL;
  if (warning >= critical) {
    errors.push(
      `filter_warning (${String(warning)}) must be lower than filter_critical (${String(critical)})`,
    );
  }

  const speeds = cfg.mode_speeds;
  if (isSet(speeds)) {
    if (typeof speeds !== 'object' || Array.isArray(speeds)) {
      errors.push('mode_speeds: expected a map of mode name to speed');
    } else {
      for (const [name, band] of Object.entries(speeds as Record<string, unknown>)) {
        if (!SPEED_BANDS.includes(band as SpeedBand)) {
          errors.push(
            `mode_speeds.${name}: expected one of ${SPEED_BANDS.join(', ')}, got ${String(band)}`,
          );
        }
      }
    }
  }

  for (const [role, domains] of Object.entries(ROLE_DOMAINS)) {
    const v = cfg[role];
    if (!isSet(v)) continue;
    if (typeof v !== 'string' || !ENTITY_ID.test(v)) {
      errors.push(`${role}: invalid entity id "${String(v)}"`);
      continue;
    }
    const domain = v.slice(0, v.indexOf('.'));
    if (!domains.includes(domain)) {
      warnings.push(`${role}: expected ${listDomains(domains)} entity, got ${v}`);
    }
  }

  if (TEMP_ROLES.filter((r) => isSet(cfg[r])).length < 2) {
    warnings.push(`map at least two of ${TEMP_ROLES.join(', ')}`);
  }

  return { errors, warnings };
}

export type ResolvedConfig = HruCardConfig & {
  -readonly [K in keyof typeof DEFAULTS]: NonNullable<HruCardConfig[K]>;
};

export function withDefaults(c: HruCardConfig): ResolvedConfig {
  const set = Object.fromEntries(Object.entries(c).filter(([, v]) => isSet(v)));
  return { ...DEFAULTS, ...set } as ResolvedConfig;
}
