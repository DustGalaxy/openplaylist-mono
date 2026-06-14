export type FieldType = 'text' | 'toggle'

export interface TextField {
  type: 'text'
  key: string
  maxLength?: number
  placeholder?: string
}

export interface ToggleField {
  type: 'toggle'
  key: string
  description?: string
}

export type BotSettingsField = TextField | ToggleField

export interface PlatformBotConfig {
  fields: BotSettingsField[]
}

export type BotSettings = Record<string, string | boolean>