export type FieldDef =
  | {
      type: 'text'
      key: string
      labelKey: string
      hintKey?: string
      maxLength?: number
      placeholder?: string
    }
  | {
      type: 'toggle'
      key: string
      labelKey: string
      descKey?: string
    }

export interface BotSettingsConfig {
  fields: FieldDef[]
}
