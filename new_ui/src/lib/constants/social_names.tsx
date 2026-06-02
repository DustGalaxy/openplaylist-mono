import { useTranslation } from 'react-i18next'
import {
  Twitch,
  Discord,
  Youtube,
  XFormerlyTwitter,
  Github,
  Google,
  Spotify,
} from '@thesvg/react'
import DonationAlerts from '@/components/icons/icon-da'

const socialIcons = {
  twitch: { icon: <Twitch />, key: 'platform.twitch' },
  discord: { icon: <Discord />, key: 'platform.discord' },
  youtube: { icon: <Youtube />, key: 'platform.youtube' },
  donationalerts: { icon: <DonationAlerts />, key: 'platform.donationalerts' },
  X: { icon: <XFormerlyTwitter />, key: 'platform.x' },
  google: { icon: <Google />, key: 'platform.google' },
  github: { icon: <Github />, key: 'platform.github' },
  spotify: { icon: <Spotify />, key: 'platform.spotify' },
} as const

interface SocialLinkHintProps {
  socialKey: string
}

export function SocialLinkHint({ socialKey }: SocialLinkHintProps) {
  const { t } = useTranslation()
  const social = socialIcons[socialKey as keyof typeof socialIcons]

  if (social) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-4 h-4">{social.icon}</div>
        <span>{t(social.key)}</span>
      </div>
    )
  }

  return <span>{socialKey}</span>
}

export default socialIcons
