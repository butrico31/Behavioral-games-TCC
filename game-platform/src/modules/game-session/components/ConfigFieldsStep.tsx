import { MessageSquareText } from 'lucide-react'
import { ConfigurationForm } from './ConfigurationForm'
import type { ConfigFieldStepMeta } from '../constants/configSteps'
import type { CreateConfigPayload, GameConfigFieldDefinition } from '../types'

const STEP_ICON = {
  popups: MessageSquareText
} as const

interface ConfigFieldsStepProps {
  meta: ConfigFieldStepMeta
  config: CreateConfigPayload
  fields: GameConfigFieldDefinition[]
  onChange: (config: CreateConfigPayload) => void
}

/** Uma etapa do assistente com um grupo de campos da configuração nova. */
export function ConfigFieldsStep({ meta, config, fields, onChange }: ConfigFieldsStepProps) {
  const Icon = STEP_ICON[meta.id]

  return (
    <section className="surface-panel p-6" aria-labelledby={`section-config-${meta.id}`}>
      <div className="mb-2 flex items-center gap-3">
        <Icon className="h-6 w-6 text-primary" />
        <h2 id={`section-config-${meta.id}`} className="text-2xl text-foreground md:text-3xl">
          {meta.title}
        </h2>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">{meta.description}</p>
      <ConfigurationForm config={config} fields={fields} onChange={onChange} />
    </section>
  )
}
