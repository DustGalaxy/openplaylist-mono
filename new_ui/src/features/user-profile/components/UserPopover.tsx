import React from 'react'
import type { PublicRole, PublicUser } from '@/types/user'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import { RoleBadgeList } from '@/components/ui/role-badge'
import { SocialLinksRow } from '@/components/ui/social-links-row'

interface UserPopoverProps {
  user?: PublicUser
}

export const UserPopover: React.FC<UserPopoverProps> = ({ user }) => {
  const userData = user

  const MOCK_ROLES: Array<PublicRole> = [
    {
      id: 'r1',
      user_id: 'u1',
      tier: 0,
      start_date: new Date(Date.now() - 400 * 86400000).toISOString(),
    }, // VIP, legend
    {
      id: 'r2',
      user_id: 'u1',
      tier: 1,
      start_date: new Date(Date.now() - 200 * 86400000).toISOString(),
    }, // Supporter, veteran
    {
      id: 'r3',
      user_id: 'u1',
      tier: 1,
      start_date: new Date(Date.now() - 90 * 86400000).toISOString(),
    }, // Supporter, loyal
    {
      id: 'r4',
      user_id: 'u1',
      tier: 2,
      start_date: new Date(Date.now() - 45 * 86400000).toISOString(),
    }, // tier без дефа → fallback "Member"
    {
      id: 'r5',
      user_id: 'u1',
      tier: 1,
      start_date: new Date(Date.now() - 10 * 86400000).toISOString(),
    }, // Supporter, active
  ]

  return (
    <Popover>
      <PopoverTrigger asChild hidden={!!!user}>
        <div className="flex gap-1 items-center ">
          <div className="text-text-main -mt-1">{userData?.username}</div>
          <button
            className="outline-none focus-visible:ring-2 focus-visible:ring-accent-3 rounded-full m-1.5
          ring-2 ring-level-3 ring-offset-1 ring-offset-level-1
          "
          >
            <Avatar
              size="lg"
              className="overflow-visible bg-level-2 cursor-pointer transition-transform hover:shadow-2xs"
            >
              <AvatarImage
                src={userData?.avatar_url}
                className="overflow-hidden rounded-full"
              />
              {/* Бадж статуса / спонсора на аватаре */}
              <AvatarBadge className="bg-emerald-500 ring-level-1 -mt-1! -ml-1!"></AvatarBadge>
              <AvatarFallback className="bg-level-2 text-text-main font-medium">
                {userData?.username[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </button>
        </div>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-80 p-0 overflow-hidden bg-level-1 border-level-3 shadow-xl rounded-xl"
      >
        {/* 1. Декоративный баннер шапки */}
        <div className="h-16 flex items-center bg-linear-to-r from-purple-900/40 via-indigo-900/40 to-accent-3/20 border-b border-level-3/50 relative">
          <Avatar
            size="lg"
            className="ring-3 ring-level-1 overflow-visible bg-level-2 ml-4 z-10"
          >
            <AvatarImage
              src={userData?.avatar_url}
              className="overflow-hidden rounded-full"
            />
            <AvatarBadge className="bg-emerald-500 ring-level-1 " />
            <AvatarFallback className="bg-level-2 text-text-main text-xl ">
              {userData?.username[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="px-4 pb-4 flex flex-col gap-2">
          {/* 2. Аватар с нахлестом на баннер */}
          <div className="flex w-full items-end ">{/* Иконки соцсетей */}</div>

          {/* 3. Информация о пользователе */}
          <div className="flex justify-between items-start ">
            <h4 className="font-bold  text-text-main text-base leading-none">
              {userData?.username}
            </h4>

            <SocialLinksRow
              socialLinks={userData?.social_links}
              className="-mt-0.5 z-10"
            />
          </div>

          {/* 4. Бейджи и Роли */}
          {userData?.roles && userData.roles.length > 0 && (
            <RoleBadgeList roles={MOCK_ROLES} />
          )}
          <RoleBadgeList roles={MOCK_ROLES} />
          {/* 5. Био */}
          <p className="text-xs text-text-secondary mt-2 leading-relaxed">
            {userData?.bio ? userData.bio : '👀 No bio.'}
          </p>
          {/* 6. Карточка "Сейчас слушает" */}
          {/* {userData.nowPlaying && (
            <div className="mt-4 p-2.5 rounded-lg bg-level-2/70 border border-level-3/60 flex items-center gap-3">
              <div className="w-9 h-9 rounded bg-accent-3/20 flex items-center justify-center shrink-0 text-accent-3">
                <Music size={18} className="animate-pulse" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-accent-3 block">
                  Сейчас слушает
                </span>
                <p className="text-xs font-medium text-text-main truncate">
                  {userData.nowPlaying.track}
                </p>
                <p className="text-[11px] text-text-secondary truncate">
                  {userData.nowPlaying.artist}
                </p>
              </div>
            </div>
          )} */}

          {/* 7. Метаданные */}
          {/* {userData.joinedAt && (
            <div className="mt-3 pt-3 border-t border-level-3/40 flex justify-between items-center text-[11px] text-text-secondary">
              <span>Спонсор проекта</span>
              <span>с {userData.joinedAt}</span>
            </div>
          )} */}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default UserPopover
