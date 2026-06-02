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
} from '@thesvg/react'
import DonationAlerts from '@/components/icons/icon-da'
import type {
  ClientPlaylist,
  Platform,
  PlaylistSettings,
} from '@/types/playlist'
import type { Integration } from '@/types/user'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { DialogDescription } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { getUserIntegrations } from '@/api/api-user'
import PlaylistDetailsForm from './playlist-details-form'
import ContentSwitch from '@/components/ui/content-switch'

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
          <RadioGroup
            defaultValue={plstMode}
            className="flex gap-0 justify-end"
            onValueChange={(e) => {
              if (e === 'flow') {
                setPlstMode('flow')
                setSettings({ ...settings, mode: 'flow' })
                canPatchSettings.current = true
                toast.success(t('playlistSettings.toast.modeUpdated'))
              } else if (e === 'static') {
                setPlstMode('static')
                setSettings({ ...settings, mode: 'static' })
                canPatchSettings.current = true
                toast.success(t('playlistSettings.toast.modeUpdated'))
              }
            }}
          >
            <div
              className={`flex items-center  cursor-pointer  bg-level-2
            py-1 pl-4 pr-[2px] rounded-l-(--rounded-std)  justify-end`}
            >
              <RadioGroupItem
                value="flow"
                id="flow-id"
                className={`sr-only `}
              />
              <Label
                htmlFor="flow-id"
                className={`${plstMode === 'flow' ? 'text-shadow-accent-1 text-shadow-md font-bold ' : ''} 
            flex cursor-pointer transition-all duration-100 text-lg`}
              >
                {t('playlistSettings.basic.flow')}
              </Label>
            </div>

            <div
              className={`flex items-center  cursor-pointer bg-level-2
            py-1 pr-4 pl-[2px] rounded-r-(--rounded-std) justify-start`}
            >
              <RadioGroupItem
                value="static"
                id="static-id"
                className="sr-only"
              />
              <Label
                htmlFor="static-id"
                className={`${plstMode === 'static' ? 'text-shadow-accent-3 text-shadow-md font-bold' : ''} 
            cursor-pointer transition-all duration-100 text-lg`}
              >
                {t('playlistSettings.basic.static')}
              </Label>
            </div>
          </RadioGroup>
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

        <RadioGroup
          defaultValue={isPublic ? 'public' : 'private'}
          className="flex gap-0 justify-end"
          onValueChange={(e) => {
            if (e === 'public') {
              setIsPublic(true)
              setPlst({
                ...playlist,
                is_public: true,
              })
              canPatchPlaylist.current = true
            } else if (e === 'private') {
              setIsPublic(false)
              setPlst({
                ...playlist,
                is_public: false,
              })
              canPatchPlaylist.current = true
            }
          }}
        >
          <div
            className={`flex items-center  cursor-pointer  bg-level-2
          py-1 pl-4 pr-[2px] rounded-l-(--rounded-std)  justify-end`}
          >
            <ContentSwitch
              leftLabel={
                <Label
                  htmlFor="public-id"
                  className={`${isPublic ? 'text-shadow-accent-1 text-shadow-md font-bold ' : ''} 
                    flex cursor-pointer transition-all duration-100 text-lg`}
                >
                  {t('playlistSettings.basic.public')}
                </Label>
              }
              rightLabel={
                <Label
                  htmlFor="private-id"
                  className={`${!isPublic ? 'text-shadow-accent-3 text-shadow-md font-bold' : ''} 
                    cursor-pointer transition-all duration-100 text-lg`}
                >
                  {t('playlistSettings.basic.private')}
                </Label>
              }
              onChange={(value) => {
                if (value === 'right') {
                  setIsPublic(false)
                } else {
                  setIsPublic(true)
                }
              }}
              defaultValue={isPublic ? 'left' : 'right'}
            />
            <RadioGroupItem
              value="public"
              id="public-id"
              className={`sr-only `}
            />
            <Label
              htmlFor="public-id"
              className={`${isPublic ? 'text-shadow-accent-1 text-shadow-md font-bold ' : ''} 
            flex cursor-pointer transition-all duration-100 text-lg`}
            >
              {t('playlistSettings.basic.public')}
            </Label>
          </div>
          <div
            className={`flex items-center  cursor-pointer bg-level-2
          py-1 pr-4 pl-[2px] rounded-r-(--rounded-std) justify-start`}
          >
            <RadioGroupItem
              value="private"
              id="private-id"
              className="sr-only"
            />
            <Label
              htmlFor="private-id"
              className={`${!isPublic ? 'text-shadow-accent-3 text-shadow-md font-bold' : ''} 
            cursor-pointer transition-all duration-100 text-lg`}
            >
              {t('playlistSettings.basic.private')}
            </Label>
          </div>
        </RadioGroup>
      </div>
      <div className="mb-4">
        <Label className=" text-lg">
          {t('playlistSettings.basic.externalSources')}
        </Label>

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
              {integrations.map((integration) => (
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
                    className="mt-0.5 flex-shrink-0 rounded-[4px] border-level-3 cursor-pointer"
                  />

                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-6 h-6 flex items-center justify-center rounded flex-shrink-0">
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
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TabBasic
