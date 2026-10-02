/** Formats a single config field's raw value for display (booleans as Sim/Não). */
export function format_config_value(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string') return value
  return '-'
}
