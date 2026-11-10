export const S = {
  intake: 'Intake',
  supply: 'Supply',
  extract: 'Extract',
  exhaust: 'Exhaust',
  recovery: 'recovery',
  unitOff: 'Unit off',
  standby: 'Standby',
  defaultName: 'Ventilation',
  noValue: '—',
  filterOk: 'Filter OK',
  replaceFilter: 'Replace filter',
  filterLevel: (v: string) => `Filter ${v}`,
} as const;
