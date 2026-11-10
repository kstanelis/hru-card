import { S } from '../strings';
import type {
  CardModel,
  Chip,
  Extra,
  ExtraKey,
  FanValue,
  HomeAssistant,
  HruCardConfig,
  Motion,
  SpeedBand,
  TempKey,
  TempValue,
} from '../types';
import { computeEfficiency } from './efficiency';
import { fanLevel } from './fan';
import { filterStatus } from './filter';
import {
  BAND_LEVEL,
  SPIN_SECONDS,
  bandFromLevel,
  flowDuration,
  modeBand,
  normaliseMode,
} from './mode';
import { formatTemp, formatValue, readNumber, readOnOff, readState } from './read';

const TEMP_KEYS: TempKey[] = ['intake', 'supply', 'extract', 'exhaust'];
const HERO_ORDER: TempKey[] = ['supply', 'extract', 'intake', 'exhaust'];
const EXTRA_KEYS: ExtraKey[] = ['recovered_power', 'power', 'humidity', 'co2', 'airflow'];
const EXTRA_LABEL: Record<ExtraKey, string> = {
  recovered_power: S.recovered,
  power: S.power,
  humidity: S.humidity,
  co2: S.co2,
  airflow: S.airflow,
};
const CHIP_DEFS: {
  kind: Chip['kind'];
  on: [string, string];
  off: [string, string];
}[] = [
  {
    kind: 'bypass',
    on: ['mdi:debug-step-over', S.bypassOpen],
    off: ['mdi:valve-closed', S.bypassClosed],
  },
  { kind: 'heater', on: ['mdi:fire', S.heaterOn], off: ['mdi:fire-off', S.heaterOff] },
  {
    kind: 'defrost',
    on: ['mdi:snowflake-melt', S.defrosting],
    off: ['mdi:snowflake', S.defrostIdle],
  },
];

const titleCase = (s: string): string =>
  s
    .replace(/_+/g, ' ')
    .trim()
    .replace(/(^|\s)\S/g, (c) => c.toUpperCase());

function readModeName(hass: HomeAssistant, id: string | undefined): string | null {
  const entity = readState(hass, id);
  if (!entity) return null;
  const domain = entity.entity_id.split('.')[0];
  if (domain === 'fan' || domain === 'climate') {
    const preset = entity.attributes.preset_mode;
    return typeof preset === 'string' && preset ? preset : null;
  }
  return entity.state;
}

function readName(hass: HomeAssistant, config: HruCardConfig): string {
  if (config.name) return config.name;
  const modeEntity = readState(hass, config.mode);
  if (hass.formatEntityName && modeEntity) {
    const name = hass.formatEntityName(modeEntity, [{ type: 'device' }]);
    if (name) return name;
  }
  return S.defaultName;
}

function readFan(
  hass: HomeAssistant,
  id: string | undefined,
  maxRpm: number,
): FanValue | undefined {
  if (!id) return undefined;
  const level = fanLevel(hass, id, maxRpm);
  const entity = readState(hass, id);
  const rpm = entity?.attributes.unit_of_measurement === 'rpm' ? formatValue(hass, id) : null;
  return { entity: id, level, display: level === null ? S.noValue : `${String(level)}%`, rpm };
}

function computeMotion(running: boolean, band: SpeedBand | null, fans: CardModel['fans']): Motion {
  if (!running) return { supply: null, extract: null, spin: null };
  const fanDuration = (fan: FanValue | undefined): number | null =>
    fan ? flowDuration(fan.level) : band ? flowDuration(BAND_LEVEL[band]) : null;
  const levels = [fans.supply, fans.extract]
    .map((f) => f?.level)
    .filter((l): l is number => typeof l === 'number');
  const spinBand =
    band ??
    (levels.length ? bandFromLevel(levels.reduce((a, b) => a + b, 0) / levels.length) : null);
  return {
    supply: fanDuration(fans.supply),
    extract: fanDuration(fans.extract),
    spin: spinBand && spinBand !== 'off' ? SPIN_SECONDS[spinBand] : null,
  };
}

export function buildModel(hass: HomeAssistant, config: HruCardConfig): CardModel {
  const temps: CardModel['temps'] = {};
  for (const key of TEMP_KEYS) {
    const entity = config[`${key}_temp`];
    if (!entity) continue;
    const value = readNumber(hass, entity);
    const t: TempValue = { key, entity, value, display: formatTemp(hass, value), label: S[key] };
    temps[key] = t;
  }

  const modeName = readModeName(hass, config.mode);
  const mode = config.mode && modeName ? { entity: config.mode, label: titleCase(modeName) } : null;
  const band = modeName ? modeBand(modeName, config.mode_speeds) : null;

  const maxRpm = config.max_rpm ?? 3000;
  const fans: CardModel['fans'] = {};
  const supplyFan = readFan(hass, config.supply_fan, maxRpm);
  const extractFan = readFan(hass, config.extract_fan, maxRpm);
  if (supplyFan) fans.supply = supplyFan;
  if (extractFan) fans.extract = extractFan;

  const mappedFans = [supplyFan, extractFan].filter((f): f is FanValue => f !== undefined);
  const fansStopped = mappedFans.length > 0 && mappedFans.every((f) => !f.level);
  const running = band !== 'off' && !fansStopped;
  const isStandby = modeName !== null && normaliseMode(modeName).includes('standby');
  const stopped = running
    ? null
    : isStandby
      ? { label: S.standby, icon: 'mdi:power-sleep' }
      : { label: S.unitOff, icon: 'mdi:power' };

  const sensorEff = readNumber(hass, config.efficiency);
  const supplyUnit = readState(hass, config.supply_temp)?.attributes.unit_of_measurement;
  const computed = computeEfficiency(
    temps.intake?.value ?? null,
    temps.supply?.value ?? null,
    temps.extract?.value ?? null,
    typeof supplyUnit === 'string' ? supplyUnit : undefined,
  );
  const recovery =
    sensorEff !== null
      ? { value: Math.round(sensorEff), approx: false }
      : computed !== null
        ? { value: computed, approx: true }
        : null;

  let subtitle: string;
  if (stopped) {
    subtitle = isStandby ? S.standbySubtitle : S.offSubtitle;
  } else {
    const parts: string[] = [];
    if (mode) parts.push(S.modeSuffix(mode.label));
    if (recovery) {
      parts.push(S.heatRecovery(`${recovery.approx ? '≈' : ''}${String(recovery.value)}%`));
    }
    subtitle = parts.length ? parts.join(S.separator) : S.heatRecoveryActive;
  }

  const chips: Chip[] = [];
  for (const def of CHIP_DEFS) {
    const entity = config[def.kind];
    if (!entity) continue;
    const active = readOnOff(hass, entity) === true;
    const [icon, label] = active ? def.on : def.off;
    chips.push({ kind: def.kind, entity, active, icon, label });
  }

  const extras: Extra[] = [];
  for (const key of EXTRA_KEYS) {
    const entity = config[key];
    if (!entity) continue;
    extras.push({ key, entity, label: EXTRA_LABEL[key], display: formatValue(hass, entity) });
  }

  const heroKey = HERO_ORDER.find((k) => typeof temps[k]?.value === 'number');
  const heroTemp = heroKey ? temps[heroKey] : undefined;
  const intake = temps.intake;
  const hero =
    heroKey && heroTemp
      ? {
          key: heroKey,
          label: `${heroTemp.label}${S.airSuffix}`,
          display: heroTemp.display,
          sub:
            heroKey === 'supply' && intake && intake.value !== null
              ? S.fromIntake(intake.display)
              : null,
        }
      : null;

  return {
    name: readName(hass, config),
    icon: config.icon ?? S.defaultIcon,
    subtitle,
    mode,
    running,
    stopped,
    temps,
    tempCount: Object.keys(temps).length,
    fans,
    motion: computeMotion(running, band, fans),
    recovery,
    filter: filterStatus(hass, config),
    chips,
    extras,
    hero,
  };
}
