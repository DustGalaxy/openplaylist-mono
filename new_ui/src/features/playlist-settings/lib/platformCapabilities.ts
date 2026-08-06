import type { PlatformCapabilities } from '../types'
import { Platform } from '@/types/playlist'

export const PLATFORM_CAPABILITIES: Record<Platform, PlatformCapabilities> = {
  [Platform.General]: {
    contentSettings: true,
    labelKey: 'common.general',
    icon: '',
    chatRoles: false,
    donationRules: true,
  },
  [Platform.Twitch]: {
    contentSettings: true,
    chatRoles: true,
    donationRules: false,
    labelKey: 'platform.twitch',
    icon: '',
  },
  [Platform.YouTube]: {
    contentSettings: true,
    chatRoles: true,
    donationRules: false,
    labelKey: 'platform.youtube',
    icon: '',
  },
  [Platform.Web]: {
    contentSettings: true,
    chatRoles: false,
    donationRules: false,
    labelKey: 'common.web',
    icon: '',
  },
  [Platform.DonationAlerts]: {
    contentSettings: true,
    chatRoles: false,
    donationRules: true,
    labelKey: 'platform.donationalerts',
    icon: '',
  },
  [Platform.DonateX]: {
    contentSettings: true,
    chatRoles: false,
    donationRules: true,
    labelKey: 'platform.donatex',
    icon: '',
  },
  [Platform.DonatePay]: {
    contentSettings: true,
    chatRoles: false,
    donationRules: true,
    labelKey: 'platform.donatepay',
    icon: '',
  },
}

export function getPlatformCapabilities(
  platform: Platform,
): PlatformCapabilities {
  return PLATFORM_CAPABILITIES[platform]
}
