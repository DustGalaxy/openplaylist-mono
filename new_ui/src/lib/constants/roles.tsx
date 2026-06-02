import type { Role } from '@/types/playlist'
import type { ReactElement } from 'react'
import { ChatPlatform } from '@/types/playlist'

const default_roles: Record<ChatPlatform, Array<Role>> = {
  [ChatPlatform.Twitch]: [
    {
      key: 'broadcaster',
      name: 'Broadcaster',
      platform: ChatPlatform.Twitch,
      badge_type: 'img',
      badge_url:
        'https://static-cdn.jtvnw.net/badges/v1/5527c58c-fb7d-422d-b71b-f309dcb85cc1/1',
    },
    {
      key: 'moderator',
      name: 'Moderator',
      platform: ChatPlatform.Twitch,
      badge_type: 'img',
      badge_url:
        'https://static-cdn.jtvnw.net/badges/v1/3267646d-33f0-4b17-b3df-f923a41db1d0/1',
    },
    {
      key: 'vip',
      name: 'VIP',
      platform: ChatPlatform.Twitch,
      badge_type: 'img',
      badge_url:
        'https://static-cdn.jtvnw.net/badges/v1/b817aba4-fad8-49e2-b88a-7cc744dfa6ec/3',
    },
    {
      key: 'subscriber',
      name: 'Subscriber',
      platform: ChatPlatform.Twitch,
      badge_type: 'svg',
      badge_url: (
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="var(--color-accent-1)"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M8.944 2.654c.406-.872 1.706-.872 2.112 0l1.754 3.77 4.2.583c.932.13 1.318 1.209.664 1.853l-3.128 3.083.755 4.272c.163.92-.876 1.603-1.722 1.132L10 15.354l-3.579 1.993c-.846.47-1.885-.212-1.722-1.132l.755-4.272L2.326 8.86c-.654-.644-.268-1.723.664-1.853l4.2-.583 1.754-3.77z"></path>
        </svg>
      ) as ReactElement,
    },
    {
      key: 'turbo',
      name: 'Turbo',
      platform: ChatPlatform.Twitch,
      badge_type: 'img',
      badge_url:
        'https://static-cdn.jtvnw.net/badges/v1/bd444ec6-8f34-4bf9-91f4-af1e3428d80f/1',
    },
    {
      key: 'artist',
      name: 'Artist',
      platform: ChatPlatform.Twitch,
      badge_type: 'img',
      badge_url: 'https://assets.help.twitch.tv/article/img/000002399-05.png',
    },
    {
      key: 'follower',
      name: 'Follower',
      platform: ChatPlatform.Twitch,
      badge_type: 'svg',
      badge_url: (
        <svg
          width="18px"
          height="18px"
          version="1.1"
          viewBox="0 0 20 20"
          x="0px"
          y="0px"
          fill="var(--color-accent-1)"
        >
          <path
            d="M9.171 4.171A4 4 0 0 0 6.343 3H6a4 4 0 0 0-4 4v.343a4 4 0 0 0 1.172 2.829L10 17l6.828-6.828A4 4 0 0 0 18 7.343V7a4 4 0 0 0-4-4h-.343a4 4 0 0 0-2.829 1.172L10 5l-.829-.829z"
            fillRule="evenodd"
          ></path>
        </svg>
      ),
    },
  ],
  [ChatPlatform.YouTube]: [],
}

export default default_roles
