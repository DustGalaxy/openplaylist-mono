import type { PlatformBotConfig } from '@/types/botSettings'

export const BOT_SETTINGS_CONFIG: Record<string, PlatformBotConfig> = {
  twitch: {
    fields: [
      {
        type: 'text',
        key: 'prefix',
        maxLength: 5,
        placeholder: '!',
      },
      {
        type: 'toggle',
        key: 'announce_songs',
      },
    ],
  },
  donationalerts: {
    fields: [],
  },
}