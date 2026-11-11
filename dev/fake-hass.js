// Fake hass object for manual preview (not bundled). Mirrors the canvas sample unit.
const st = (id, state, attributes = {}) => ({
  entity_id: id,
  state: String(state),
  attributes,
  last_changed: '',
  last_updated: '',
});

export const values = {
  mode: 'Normal',
  supplyFan: 45,
  extractFan: 42,
  heater: 'off',
  bypass: 'off',
  defrost: 'off',
  filter: 62,
  dark: true,
};

export function makeHass(v = values) {
  const states = [
    st('sensor.hru_intake_temperature', 4.0, { unit_of_measurement: '°C' }),
    st('sensor.hru_supply_temperature', 19.5, { unit_of_measurement: '°C' }),
    st('sensor.hru_extract_temperature', 22.0, { unit_of_measurement: '°C' }),
    st('sensor.hru_exhaust_temperature', 6.5, { unit_of_measurement: '°C' }),
    st('input_number.hru_target', 21, { unit_of_measurement: '°C' }),
    st('sensor.hru_supply_fan', v.supplyFan, { unit_of_measurement: '%' }),
    st('sensor.hru_extract_fan', v.extractFan, { unit_of_measurement: '%' }),
    st('select.hru_mode', v.mode),
    st('sensor.hru_filter', v.filter, { unit_of_measurement: '%' }),
    st('binary_sensor.hru_bypass', v.bypass),
    st('binary_sensor.hru_heater', v.heater),
    st('binary_sensor.hru_defrost', v.defrost),
    st('sensor.hru_power', 48, { unit_of_measurement: 'W' }),
    st('sensor.hru_recovered_power', 850, { unit_of_measurement: 'W' }),
    st('sensor.hru_humidity', 45, { unit_of_measurement: '%' }),
  ];
  return {
    states: Object.fromEntries(states.map((s) => [s.entity_id, s])),
    locale: { language: 'en' },
    themes: { darkMode: v.dark },
  };
}

export const config = {
  type: 'custom:hru-card',
  intake_temp: 'sensor.hru_intake_temperature',
  supply_temp: 'sensor.hru_supply_temperature',
  extract_temp: 'sensor.hru_extract_temperature',
  exhaust_temp: 'sensor.hru_exhaust_temperature',
  target_temp: 'input_number.hru_target',
  supply_fan: 'sensor.hru_supply_fan',
  extract_fan: 'sensor.hru_extract_fan',
  mode: 'select.hru_mode',
  filter: 'sensor.hru_filter',
  bypass: 'binary_sensor.hru_bypass',
  heater: 'binary_sensor.hru_heater',
  defrost: 'binary_sensor.hru_defrost',
  power: 'sensor.hru_power',
  recovered_power: 'sensor.hru_recovered_power',
  humidity: 'sensor.hru_humidity',
};
