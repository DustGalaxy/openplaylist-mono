import type { BotSettingsConfig } from './types'

const registry: Record<string, BotSettingsConfig> = {
  twitch: {
    fields: [
      {
        type: 'text',
        key: 'prefix',
        labelKey: 'settings.botSettings.twitch.prefix.label',
        hintKey: 'settings.botSettings.twitch.prefix.hint',
        placeholderKey: 'settings.botSettings.twitch.prefix.placeholder',
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

