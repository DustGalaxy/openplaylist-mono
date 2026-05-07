import { Twitch, Discord, Youtube, XFormerlyTwitter, Github, Spotify } from '@thesvg/react'

const socials = {
  twitch: {
    name: 'Twitch',
    icon: <Twitch />,
  },
  discord: {
    name: 'Discord',
    icon: <Discord />,
  },
  youtube: {
    name: 'YouTube',
    icon: <Youtube />,
  },
  X: {
    name: 'X',
    icon: <XFormerlyTwitter />,
  },
  github: {
    name: 'GitHub',
    icon: <Github />,
  },
  spotify: {
    name: 'Spotify',
    icon: <Spotify />,
  },
}

interface SocialLinkHintProps {
  socialKey: string
}

export function SocialLinkHint({ socialKey }: SocialLinkHintProps) {
  const social = socials[socialKey as keyof typeof socials]

  if (social) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-4 h-4">{social.icon}</div>
        <span>{social.name}</span>
      </div>
    )
  }

  return <span>{socialKey}</span>
}

export default socials
