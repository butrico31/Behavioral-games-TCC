import { ChevronDown } from 'lucide-react'
import { humanizeLabel } from '../../../shared/utils/humanizeLabel'
import {
  CONFIG_ENUM_LABELS_PT,
  CONFIG_FIELD_HINTS_PT,
  CONFIG_FIELD_LABELS_PT
} from '../constants/configFieldLabels'
import { is_round_popup_list } from '../utils/roundPopups'
import { RoundPopupsEditor } from './RoundPopupsEditor'
import type { ConfigFieldValue, CreateConfigPayload, GameConfigFieldDefinition } from '../types'

function Toggle({ value, onToggle }: { value: boolean; onToggle: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onToggle(!value)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        value ? 'bg-primary' : 'bg-border'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-foreground transition-transform ${
          value ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

const input_class =
  'input-shell'

const select_class =
  'input-shell appearance-none'

const label_class = 'block text-sm font-medium text-foreground mb-2'


const parse_enum_options = (field_type: string): string[] => {
  const match = /^enum\((.+)\)$/.exec(field_type)
  if (!match) return []
  return match[1]
    .split(/[,|]/)
    .map((option) => option.trim())
    .filter(Boolean)
}

interface ConfigurationFormProps {
  config: CreateConfigPayload
  /** Campos desta etapa do assistente, em grade de 2 colunas para a tela não precisar rolar. */
  fields: GameConfigFieldDefinition[]
  onChange: (config: CreateConfigPayload) => void
}

export function ConfigurationForm({
  config,
  fields,
  onChange
}: ConfigurationFormProps) {
  const handleChange = (field: string, value: ConfigFieldValue) => {
    onChange({ ...config, [field]: value })
  }

  const render_field = (field: GameConfigFieldDefinition) => {
    if (field.name === 'game') return null

    const field_label = CONFIG_FIELD_LABELS_PT[field.name] ?? humanizeLabel(field.name)
    const field_hint = CONFIG_FIELD_HINTS_PT[field.name]
    const field_value = config[field.name]

    if (field.type === 'roundPopups') {
      return (
        <div key={field.name} className="sm:col-span-2">
          <RoundPopupsEditor
            label={field_label}
            hint={field_hint}
            popups={is_round_popup_list(field_value) ? field_value : []}
            onChange={(popups) => handleChange(field.name, popups)}
          />
        </div>
      )
    }

    if (field.type === 'boolean') {
      return (
        <div key={field.name} className="surface-subtle flex items-center justify-between p-4">
          <div className="pr-4">
            <p className="text-sm font-medium text-foreground">{field_label}</p>
            {field_hint && <p className="text-xs text-muted-foreground mt-1">{field_hint}</p>}
          </div>
          <Toggle
            value={Boolean(field_value)}
            onToggle={(next_value) => handleChange(field.name, next_value)}
          />
        </div>
      )
    }

    if (field.type === 'number') {
      return (
        <div key={field.name}>
          <label htmlFor={`config-${field.name}`} className={label_class}>{field_label}</label>
          <input
            id={`config-${field.name}`}
            type="number"
            min={0}
            placeholder="Sem limite"
            value={typeof field_value === 'number' && field_value > 0 ? field_value : ''}
            onChange={(e) => handleChange(field.name, e.target.value === '' ? 0 : Number(e.target.value))}
            className={input_class}
          />
          {field_hint && <p className="text-xs text-muted-foreground mt-1">{field_hint}</p>}
        </div>
      )
    }

    if (/^enum\(.+\)$/.test(field.type)) {
      const options = parse_enum_options(field.type)
      return (
        <div key={field.name}>
          <label htmlFor={`config-${field.name}`} className={label_class}>{field_label}</label>
          <div className="relative">
            <select
              id={`config-${field.name}`}
              value={typeof field_value === 'string' ? field_value : options[0] ?? ''}
              onChange={(e) => handleChange(field.name, e.target.value)}
              className={select_class}
              disabled={options.length === 0}
            >
              {options.length === 0 && <option value="">Sem opções disponíveis</option>}
              {options.map((option) => (
                <option key={option} value={option}>
                  {CONFIG_ENUM_LABELS_PT[option] ?? option}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
          </div>
          {field_hint && <p className="text-xs text-muted-foreground mt-1">{field_hint}</p>}
        </div>
      )
    }

    return (
      <div key={field.name} className="sm:col-span-2">
        <label htmlFor={`config-${field.name}`} className={label_class}>{field_label}</label>
        <input
          id={`config-${field.name}`}
          type="text"
          value={typeof field_value === 'string' ? field_value : ''}
          onChange={(e) => handleChange(field.name, e.target.value)}
          className={input_class}
        />
      </div>
    )
  }

  return <div className="grid items-start gap-4 sm:grid-cols-2">{fields.map(render_field)}</div>
}
