import React, { useEffect, useState } from 'react'
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

const TabBasic = ({
  playlist,
  setPlst,
  canPatchPlaylist,
  settings,
  setSettings,
  canPatchSettings,
}: {
  playlist: ClientPlaylist
  setPlst: React.Dispatch<React.SetStateAction<ClientPlaylist>>
  canPatchPlaylist: React.RefObject<boolean>
  setSettings: React.Dispatch<React.SetStateAction<PlaylistSettings>>
  canPatchSettings: React.RefObject<boolean>
  settings: PlaylistSettings
}) => {
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
    const platformMap: Record<string, string> = {
      twitch: 'Twitch',
      donationalerts: 'Donation Alerts',
      da: 'Donation Alerts',
      youtube: 'YouTube',
    }
    return platformMap[platform.toLowerCase()] || platform
  }

  const isSourceSelected = (platform: string, platformUserId: string) => {
    console.log(
      'playlist sources:',
      playlist.allow_sources,
      '  checking for:',
      platform,
      platformUserId,
    )

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
    } else {
      // Add the source
      setPlst({
        ...playlist,
        allow_sources: [
          ...playlist.allow_sources,
          { platform: platform as Platform, platform_user_id: platformUserId },
        ],
      })
    }
    canPatchPlaylist.current = true
  }
  return (
    <div>
      <div className="grid gap-4">
        <div className="grid grid-cols-[auto_1fr] gap-2">
          <Label className=" text-lg">Playlist mode</Label>
          <RadioGroup
            defaultValue={plstMode}
            className="flex gap-0 justify-end"
            onValueChange={(e) => {
              if (e === 'flow') {
                setPlstMode('flow')
                setSettings({ ...settings, mode: 'flow' })
                canPatchSettings.current = true
              } else if (e === 'static') {
                setPlstMode('static')
                setSettings({ ...settings, mode: 'static' })
                canPatchSettings.current = true
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
                FLOW
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
                STATIC
              </Label>
            </div>
          </RadioGroup>
        </div>
      </div>
      <DialogDescription>
        <div className="py-1">
          Flow - remove track after playing or skip to next track.
        </div>
        <div className="py-1">Static - normal playlist.</div>
      </DialogDescription>
      <div className="grid grid-cols-[auto_1fr] gap-2">
        <Label className=" text-lg">Privacy</Label>

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
              PUBLIC
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
              PRIVATE
            </Label>
          </div>
        </RadioGroup>
      </div>
      <div>
        <Label className=" text-lg">External content sources</Label>
        <DialogDescription>
          <div className="py-1">
            This setting allows users to add tracks from different sources. If
            no sources are selected, users can add tracks only by web view if
            they are logged in and playlist are public.
          </div>
          <div className="py-1">
            If you enable any external source in a few playlists in same time,
            requests will be set in all selected playlists, so be careful with
            it.
          </div>
        </DialogDescription>

        <div className=" rounded-(--rounded-std) w-full mt-3">
          {isLoadingIntegrations ? (
            <div className="text-center py-4 text-sm text-gray-500">
              Loading integrations...
            </div>
          ) : integrations.length === 0 ? (
            <div className="text-center py-4 text-sm text-gray-500">
              No integrations found. Connect your platforms in settings to
              enable external sources.
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
