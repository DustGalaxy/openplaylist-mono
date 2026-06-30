import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  Discord,
  Github,
  Spotify,
  Twitch,
  XFormerlyTwitter,
  Youtube,
  Google,
} from '@thesvg/react'
import DonationAlerts from '@/components/icons/icon-da'
import {
  ExternalContentPlatform,
  type ClientPlaylist,
  type Platform,
  type PlaylistSettings,
} from '@/types/playlist'
import type { Integration } from '@/types/user'
import { Label } from '@/components/ui/label'
import { DialogDescription } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { getUserIntegrations } from '@/api/api-user'
import PlaylistDetailsForm from './playlist-details-form'
import ContentSwitch from '@/components/ui/content-switch'
import { Switch } from '@/components/ui/switch'

const TabBasic = ({
  playlist,
  setPlst,
  canPatchPlaylist,
  settings,
  setSettings,
  canPatchSettings,
}: {
  playlist: ClientPlaylist
  setPlst: React.Dispatch<React.SetStateAction<ClientPlaylist | undefined>>
  canPatchPlaylist: React.RefObject<boolean>
  setSettings: React.Dispatch<React.SetStateAction<PlaylistSettings>>
  canPatchSettings: React.RefObject<boolean>
  settings: PlaylistSettings
}) => {
  const { t } = useTranslation()
  const [plstMode, setPlstMode] = React.useState(playlist.settings.mode)
  const [isPublic, setIsPublic] = React.useState(playlist.is_public)
  const [priorityMode, setPriorityMode] = React.useState(
    playlist.settings.cost_mode,
  )
  const [showInWidget, setShowInWinget] = React.useState(
    playlist.show_in_widget,
  )
  const [integrations, setIntegrations] = useState<Array<Integration>>([])
  const [isLoadingIntegrations, setIsLoadingIntegrations] = useState(false)

  useEffect(() => {
    const fetchIntegrations = async () => {
      try {
        setIsLoadingIntegrations(true)
        const data = await getUserIntegrations()
        setIntegrations(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('Failed to fetch integrations:', error)
        setIntegrations([])
      } finally {
        setIsLoadingIntegrations(false)
      }
    }
    fetchIntegrations()
  }, [])

  const getPlatformIcon = (platform: string) => {
    const iconStyles = ' size-6'
    const platformIcons: Record<string, React.ReactNode> = {
      twitch: <Twitch className={iconStyles} />,
      discord: <Discord className={iconStyles} />,
      youtube: <Youtube className={iconStyles} />,
      X: <XFormerlyTwitter className={iconStyles} />,
      twitter: <XFormerlyTwitter className={iconStyles} />,
      github: <Github className={iconStyles} />,
      spotify: <Spotify className={iconStyles} />,
      donationalerts: <DonationAlerts className={iconStyles} />,
      da: <DonationAlerts className={iconStyles} />,
      donatex: <img src="/donatex-icon.png" width={45} height={45}></img>,
      google: <Google className={iconStyles} />,
    }
    return platformIcons[platform.toLowerCase()] || null
  }

  const getPlatformDisplayName = (platform: string) => {
    const normalized = platform.toLowerCase()
    const keyMap: Record<string, string> = {
      twitch: 'platform.twitch',
      donationalerts: 'platform.donationalerts',
      da: 'platform.da',
      youtube: 'platform.youtube',
      discord: 'platform.discord',
      github: 'platform.github',
      spotify: 'platform.spotify',
      x: 'platform.x',
      google: 'platform.google',
      donatex: 'platform.donatex',
      donatepay: 'platform.donatepay',
    }
    const key = keyMap[normalized]
    return key ? t(key) : platform
  }

  const isSourceSelected = (platform: string, platformUserId: string) => {
    return playlist.allow_sources.some(
      (source) =>
        source.platform === platform &&
        source.platform_user_id === platformUserId,
    )
  }

  const handleSourceToggle = (platform: string, platformUserId: string) => {
    const isCurrentlySelected = isSourceSelected(platform, platformUserId)

    if (isCurrentlySelected) {
      // Remove the source
      setPlst({
        ...playlist,
        allow_sources: playlist.allow_sources.filter(
          (source) =>
            !(
              source.platform === platform &&
              source.platform_user_id === platformUserId
            ),
        ),
      })
      toast.success(t('playlistSettings.toast.visibilityUpdated'))
    } else {
      // Add the source
      setPlst({
        ...playlist,
        allow_sources: [
          ...playlist.allow_sources,
          { platform: platform as Platform, platform_user_id: platformUserId },
        ],
      })
      toast.success(t('playlistSettings.toast.visibilityUpdated'))
    }
    canPatchPlaylist.current = true
  }
  return (
    <div>
      <PlaylistDetailsForm
        playlist={playlist}
        setPlst={setPlst}
        canPatchPlaylist={canPatchPlaylist}
      />

      <div className="grid gap-4">
        <div className="grid grid-cols-[auto_1fr] gap-2">
          <Label className=" text-lg">
            {t('playlistSettings.basic.modeTitle')}
          </Label>

          <div
            className={`flex items-center  cursor-pointer  
          py-1 pl-4 pr-0.5 rounded-l-(--rounded-std)  justify-end`}
          >
            <ContentSwitch
              leftLabel={
                <Label
                  htmlFor="flow-id"
                  className={`text-shadow-md font-semibold
                    flex cursor-pointer transition-all duration-100 text-lg`}
                >
                  {t('playlistSettings.basic.flow')}
                </Label>
              }
              rightLabel={
                <Label
                  htmlFor="static-id"
                  className={`text-shadow-md font-semibold
                    cursor-pointer transition-all duration-100 text-lg`}
                >
                  {t('playlistSettings.basic.static')}
                </Label>
              }
              onChange={(value) => {
                if (value === 'left') {
                  setPlstMode('flow')
                  setSettings({ ...settings, mode: 'flow' })
                  canPatchSettings.current = true
                } else {
                  setPlstMode('static')
                  setSettings({ ...settings, mode: 'static' })
                  canPatchSettings.current = true
                }
              }}
              defaultValue={plstMode === 'flow' ? 'left' : 'right'}
            />
          </div>
        </div>
      </div>
      <DialogDescription>
        <div className="py-1">{t('playlistSettings.basic.flowHelp')}</div>
        <div className="py-1">{t('playlistSettings.basic.staticHelp')}</div>
      </DialogDescription>
      <div className="grid grid-cols-[auto_1fr] gap-2">
        <Label className=" text-lg">
          {t('playlistSettings.basic.privacy')}
        </Label>

        <div
          className={`flex items-center  cursor-pointer  
          py-1 pl-4 pr-0.5 rounded-l-(--rounded-std)  justify-end`}
        >
          <ContentSwitch
            leftLabel={
              <Label
                htmlFor="public-id"
                className={`text-shadow-md font-semibold
                    flex cursor-pointer transition-all duration-100 text-lg`}
              >
                {t('playlistSettings.basic.public')}
              </Label>
            }
            rightLabel={
              <Label
                htmlFor="private-id"
                className={`text-shadow-md font-semibold
                    cursor-pointer transition-all duration-100 text-lg`}
              >
                {t('playlistSettings.basic.private')}
              </Label>
            }
            onChange={(value) => {
              if (value === 'right') {
                setIsPublic(false)
                setPlst({
                  ...playlist,
                  is_public: false,
                })
                canPatchPlaylist.current = true
              } else {
                setIsPublic(true)
                setPlst({
                  ...playlist,
                  is_public: true,
                })
                canPatchPlaylist.current = true
              }
            }}
            defaultValue={isPublic ? 'left' : 'right'}
          />
        </div>
      </div>
      <DialogDescription>
        <div className="py-1">{t('playlistSettings.basic.publicHelp')}</div>
        <div className="py-1">{t('playlistSettings.basic.privateHelp')}</div>
      </DialogDescription>

      <div className="grid grid-cols-[auto_1fr] gap-2">
        <Label className=" text-lg">
          {t('playlistSettings.basic.priorityMode')}
        </Label>

        <div
          className={`flex items-center  cursor-pointer  
          py-1 pl-4 pr-0.5 rounded-l-(--rounded-std)  justify-end`}
        >
          <ContentSwitch
            leftLabel={
              <Label
                htmlFor="max-id"
                className={`text-shadow-md font-semibold
                    flex cursor-pointer transition-all duration-100 text-lg`}
              >
                {t('playlistSettings.basic.priorityModeMax')}
              </Label>
            }
            rightLabel={
              <Label
                htmlFor="add-id"
                className={`text-shadow-md font-semibold 
                    cursor-pointer transition-all duration-100 text-lg`}
              >
                {t('playlistSettings.basic.priorityModeAdd')}
              </Label>
            }
            onChange={(value) => {
              if (value === 'right') {
                setPriorityMode('add')
                setSettings({ ...settings, cost_mode: 'add' })
                canPatchSettings.current = true
              } else {
                setPriorityMode('max')
                setSettings({ ...settings, cost_mode: 'max' })
                canPatchSettings.current = true
              }
            }}
            defaultValue={priorityMode === 'max' ? 'left' : 'right'}
          />
        </div>
        <DialogDescription>
          <div className="py-1">
            {t('playlistSettings.basic.priorityModeAddHelp')}
          </div>
          <div className="py-1">
            {t('playlistSettings.basic.priorityModeMaxHelp')}
          </div>
        </DialogDescription>
      </div>

      <div className="grid grid-cols-[auto_1fr] items-center gap-2 mb-4">
        <Label className="text-lg">
          {t('playlistSettings.basic.showInWidget')}
        </Label>
        <div
          className={`flex items-center  cursor-pointer  
          py-1 pl-4 pr-0.5 rounded-l-(--rounded-std)  justify-end`}
        >
          <ContentSwitch
            leftLabel={
              <Label
                htmlFor="widget-no-id"
                className={`text-shadow-md font-semibold
                    flex cursor-pointer transition-all duration-100 text-lg`}
              >
                {t('playlistSettings.basic.showInWidgetNo')}
              </Label>
            }
            rightLabel={
              <Label
                htmlFor="widget-yes-id"
                className={`text-shadow-md font-semibold 
                    cursor-pointer transition-all duration-100 text-lg`}
              >
                {t('playlistSettings.basic.showInWidgetYes')}
              </Label>
            }
            onChange={(value) => {
              setShowInWinget(value === 'right')
              setPlst({ ...playlist, show_in_widget: value === 'right' })
              canPatchPlaylist.current = true
            }}
            defaultValue={showInWidget ? 'right' : 'left'}
          />
        </div>

        {/* <Switch
          checked={showInWidget}
          onCheckedChange={(value) => {
            setShowInWinget(value)
            setPlst({ ...playlist, show_in_widget: value })
            canPatchPlaylist.current = true
          }}
          className="justify-self-end ring-2 ring-level-3 scale-130"
        /> */}
      </div>

      <div className="mb-4">
        <Label className=" text-lg">
          {t('playlistSettings.basic.externalSources')}
        </Label>
        <DialogDescription>
          <div className="py-1">
            {t('playlistSettings.basic.externalSourcesHelp')}
          </div>
        </DialogDescription>
        <div className=" rounded-(--rounded-std) w-full mt-3">
          {isLoadingIntegrations ? (
            <div className="text-center py-4 text-sm text-gray-500">
              {t('playlistSettings.basic.integrationsLoading')}
            </div>
          ) : integrations.length === 0 ? (
            <div className="text-center py-4 text-sm text-gray-500">
              {t('playlistSettings.basic.integrationsEmpty')}
            </div>
          ) : (
            <div className="space-y-3">
              {integrations.map((integration) => {
                if (
                  !Object.values(ExternalContentPlatform).includes(
                    integration.platform,
                  )
                )
                  return null

                return (
                  <div
                    key={`${integration.platform}-${integration.platform_user_id}`}
                    className="flex items-center gap-3 px-3 py-2 rounded bg-level-2 transition-colors cursor-pointer"
                    onClick={() =>
                      handleSourceToggle(
                        integration.platform,
                        integration.platform_user_id,
                      )
                    }
                  >
                    <Checkbox
                      checked={isSourceSelected(
                        integration.platform,
                        integration.platform_user_id,
                      )}
                      onCheckedChange={() =>
                        handleSourceToggle(
                          integration.platform,
                          integration.platform_user_id,
                        )
                      }
                      className="mt-0.5 shrink-0 rounded-lg border-level-3 cursor-pointer"
                    />

                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-6 h-6 flex items-center justify-center rounded shrink-0">
                        {getPlatformIcon(integration.platform)}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-sm">
                          {getPlatformDisplayName(integration.platform)}
                        </span>
                        <span className="text-xs text-gray-400 truncate">
                          @{integration.platform_username}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TabBasic
