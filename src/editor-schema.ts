import { ROLE_DOMAINS, type EntityRole } from './config';
import { S } from './strings';

/** The subset of Home Assistant's ha-form schema this card uses. */
export interface HaFormField {
  name: string;
  selector: Record<string, unknown>;
}

export interface HaFormSection {
  name: string;
  type: 'expandable';
  flatten: true;
  expanded?: boolean;
  schema: HaFormField[];
}

export type HaFormSchema = HaFormField | HaFormSection;

const entity = (role: EntityRole): HaFormField => ({
  name: role,
  selector: { entity: { filter: { domain: ROLE_DOMAINS[role] } } },
});

const select = (name: string, options: [string, string][]): HaFormField => ({
  name,
  selector: {
    select: { mode: 'dropdown', options: options.map(([value, label]) => ({ value, label })) },
  },
});

const percent = (name: string): HaFormField => ({
  name,
  selector: { number: { min: 0, max: 100, step: 1, mode: 'box', unit_of_measurement: '%' } },
});

const section = (name: string, schema: HaFormField[], expanded = false): HaFormSection => ({
  name,
  type: 'expandable',
  flatten: true,
  ...(expanded ? { expanded } : {}),
  schema,
});

/** Editor schema: five sections, data stays flat (one key per config option). */
export function buildSchema(): HaFormSection[] {
  const E = S.editor;
  return [
    section(
      'appearance',
      [
        select('layout', [
          ['flow', E.layoutFlow],
          ['lanes', E.layoutLanes],
          ['compact', E.layoutCompact],
        ]),
        { name: 'name', selector: { text: {} } },
        { name: 'icon', selector: { icon: {} } },
        select('theme', [
          ['auto', E.themeAuto],
          ['light', E.themeLight],
          ['dark', E.themeDark],
        ]),
        { name: 'accent', selector: { text: {} } },
        { name: 'animations', selector: { boolean: {} } },
      ],
      true,
    ),
    section('temperatures', [
      entity('intake_temp'),
      entity('supply_temp'),
      entity('extract_temp'),
      entity('exhaust_temp'),
      entity('target_temp'),
    ]),
    section('fans', [
      entity('supply_fan'),
      entity('extract_fan'),
      {
        name: 'max_rpm',
        selector: { number: { min: 1, mode: 'box', unit_of_measurement: 'rpm' } },
      },
    ]),
    section('status', [
      entity('mode'),
      entity('bypass'),
      entity('heater'),
      entity('defrost'),
      entity('filter'),
      { name: 'filter_limit', selector: { number: { min: 1, mode: 'box' } } },
      percent('filter_warning'),
      percent('filter_critical'),
    ]),
    section('extras', [
      entity('efficiency'),
      entity('recovered_power'),
      entity('power'),
      entity('humidity'),
      entity('co2'),
      entity('airflow'),
    ]),
  ];
}

export function computeLabel(schema: { name: string }): string {
  const labels: Partial<Record<string, string>> = S.editor;
  return labels[schema.name] ?? schema.name;
}

/** Helper text under a field; sections and unknown keys get none. */
export function computeHelper(schema: { name: string }): string | undefined {
  const helpers: Partial<Record<string, string>> = S.editorHelp;
  return helpers[schema.name];
}
