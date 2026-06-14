import type { BotSettingsConfig } from './types'

const registry: Record<string, BotSettingsConfig> = {
  twitch: {
    fields: [
      {
        type: 'text',
        key: 'prefix',
        labelKey: 'botSettings.twitch.prefix.label',
        hintKey: 'botSettings.twitch.prefix.hint',
        maxLength: 5,
        placeholder: '!',
      },
    ],
  },
  donationalerts: {
    fields: [],
  },
}

export function getBotSettingsConfig(
  platform: string,
): BotSettingsConfig | null {
  return registry[platform] ?? null
}
