import React from 'react'
import { useTranslation } from 'react-i18next'
import { Label } from '@/components/ui/label'
import { DialogDescription } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import PlatformChatRolesTab from './platformChatRolesTab'
import type {
  ClientPlaylist,
  PlaylistSettings,
  ReadChatRules,
} from '@/types/playlist'
import { ChatPlatform } from '@/types/playlist'

const TabChatRoles = ({
  playlist,
  settings,
  setSettings,
}: {
  playlist: ClientPlaylist
  settings: PlaylistSettings
  setSettings: React.Dispatch<React.SetStateAction<PlaylistSettings>>
}) => {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = React.useState<string>(ChatPlatform.Twitch)
  const [rules, setRules] = React.useState<
    Record<ChatPlatform, Array<ReadChatRules>>
  >(() => {
    const initial = {} as Record<ChatPlatform, Array<ReadChatRules>>

    Object.values(ChatPlatform).forEach((p) => {
      initial[p] = settings.chat_rules.filter((r) => r.platform === p)
    })

    return initial
  })

  const handleRoleCreated = React.useCallback(
    (platform: ChatPlatform, role: ReadChatRules) => {
      setRules((prev) => ({
        ...prev,
        [platform]: [...prev[platform], role],
      }))
      setSettings((prev) => ({
        ...prev,
        chat_rules: [...prev.chat_rules, role],
      }))
    },
    [setSettings],
  )

  const handleRoleUpdated = React.useCallback(
    (platform: ChatPlatform, updatedRole: ReadChatRules) => {
      setRules((prev) => ({
        ...prev,
        [platform]: prev[platform].map((r) =>
          r.id === updatedRole.id ? updatedRole : r,
        ),
      }))
      setSettings((prev) => ({
        ...prev,
        chat_rules: prev.chat_rules.map((r) =>
          r.id === updatedRole.id ? updatedRole : r,
        ),
      }))
    },
    [setSettings],
  )

  const handleRoleDeleted = React.useCallback(
    (platform: ChatPlatform, role_id: string) => {
      setRules((prev) => ({
        ...prev,
        [platform]: prev[platform].filter((r) => r.id !== role_id),
      }))
      setSettings((prev) => ({
        ...prev,
        chat_rules: prev.chat_rules.filter((r) => r.id !== role_id),
      }))
    },
    [setSettings],
  )

  return (
    <div>
      <div className="gap-1 flex flex-col">
        <Label className="text-xl">
          {t('playlistSettings.chatRoles.title')}
        </Label>
        <DialogDescription>
          Configure role priorities for different chat platforms.
        </DialogDescription>
        <div className="mt-6">
          <Tabs
            orientation="vertical"
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full flex flex-row gap-6"
          >
            <TabsList className="flex flex-col h-full items-start">
              {Object.entries(ChatPlatform).map(([key, val], i) => (
                <TabsTrigger
                  key={key}
                  value={val}
                  className="w-full ring-0 data-[state=active]:ring-2 data-[state=active]:bg-level-2 ring-level-3"
                >
                  <Label className="w-full text-base text-left cursor-pointer">
                    {key === 'General' ? t(`common.general`) : key}{' '}
                  </Label>
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="flex-1">
              {Object.entries(ChatPlatform).map(([key, val]) => {
                if (val !== activeTab) return null
                return (
                  <PlatformChatRolesTab
                    key={val}
                    platform={val}
                    platformKey={key}
                    rules={rules[val]}
                    playlist_id={playlist.id}
                    settings_id={settings.id}
                    onRoleCreated={(role) => handleRoleCreated(val, role)}
                    onRoleUpdated={(role) => handleRoleUpdated(val, role)}
                    onRoleDeleted={(role_id) => handleRoleDeleted(val, role_id)}
                  />
                )
              })}
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

export default TabChatRoles
