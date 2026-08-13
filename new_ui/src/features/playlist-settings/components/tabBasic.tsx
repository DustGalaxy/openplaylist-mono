import React, { useEffect, useRef, useState } from 'react'
import {
  Globe,
  Layers,
  Music,
  PencilLine,
  Settings,
  Share2,
  Sliders,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Discord,
  Github,
  Google,
  Spotify,
  Twitch,
  XFormerlyTwitter,
  Youtube,
} from '@thesvg/react'
import type { Integration } from '@/types/user'
import type { Platform, PlaylistMode } from '@/types/playlist'
import DonationAlerts from '@/components/icons/icon-da'
import { ExternalContentPlatform } from '@/types/playlist'
import { Label } from '@/components/ui/label'
import { DialogDescription } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import UpDownBtn from '@/components/ui/funny-btn'
import { getUserIntegrations } from '@/api/api-user'
import ContentSwitch from '@/components/ui/content-switch'
import {
  filterTabActiveClass,
  filterTabBaseClass,
  filterTabInactiveClass,
} from '@/features/landing/styles'
import { cn } from '@/lib/utils'
import { usePlaylistViewLoaded } from '@/features/united-playlist/context/playlist-view-context'
import { usePlaylistStore } from '@/stores/playlistStore'
import { useFeatureTranslation } from '@/lib/i18n/featureTranslation'

const MAX_NAME_LENGTH = 100
const MAX_DESCRIPTION_LENGTH = 500

const TabBasic = () => {
  const { t, tc } = useFeatureTranslation()
  const { playlist } = usePlaylistViewLoaded()
  const { patchNow, patchDebounced } = usePlaylistStore()

  const [name, setName] = useState(playlist.name)
  const [description, setDescription] = useState(playlist.description ?? '')
  const [plstMode, setPlstMode] = useState(playlist.mode)
  const [isPublic, setIsPublic] = useState(playlist.is_public)
  const [priorityMode, setPriorityMode] = useState(playlist.cost_mode)
  const [showInWidget, setShowInWidget] = useState(playlist.show_in_widget)
  const [integrations, setIntegrations] = useState<Array<Integration>>([])
  const [isLoadingIntegrations, setIsLoadingIntegrations] = useState(false)
  const breakPointRef = useRef<HTMLInputElement>(null)
  const maxPlaylistSizeRef = useRef<HTMLInputElement>(null)

  const activeModeSettings = playlist.mode_settings[plstMode]

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
    void fetchIntegrations()
  }, [])

  const getPlatformIcon = (platform: string) => {
    const iconStyles = 'size-4'
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
      donatex: (
        <img src="/donatex-icon.png" width={18} height={18} alt="donatex" />
      ),
      google: <Google className={iconStyles} />,
    }
    return (
      platformIcons[platform.toLowerCase()] || <Globe className={iconStyles} />
    )
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
    return key ? tc(key) : platform
  }

  const isSourceSelected = (platform: string, platformUserId: string) => {
    return playlist.allow_sources.some(
      (source: { platform: string; platform_user_id: string }) =>
        source.platform === platform &&
        source.platform_user_id === platformUserId,
    )
  }

  const handleSourceToggle = (platform: string, platformUserId: string) => {
    const isCurrentlySelected = isSourceSelected(platform, platformUserId)

    if (isCurrentlySelected) {
      patchDebounced(playlist.id, {
        allow_sources: playlist.allow_sources.filter(
          (source: { platform: string; platform_user_id: string }) =>
            !(
              source.platform === platform &&
              source.platform_user_id === platformUserId
            ),
        ),
      })
      toast.success(t('playlistSettings.toast.visibilityUpdated'))
    } else {
      patchDebounced(playlist.id, {
        allow_sources: [
          ...playlist.allow_sources,
          { platform: platform as Platform, platform_user_id: platformUserId },
        ],
      })
      toast.success(t('playlistSettings.toast.visibilityUpdated'))
    }
  }

  return (
    <div className="space-y-4">
      {/* Main Header */}
      <div className="flex items-start gap-2.5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-level-1 border border-accent/40 text-accent mt-0.5">
          <Settings className="size-5" />
        </div>
        <div>
          <Label className="text-base font-bold text-text-main">
            {t('playlistSettings.tabs.basic', 'Basic Settings')}
          </Label>
          <DialogDescription className="text-xs text-text-secondary mt-0.5">
            {t(
              'playlistSettings.basic.subtitle',
              'Configure general details, privacy, execution mode, and integrations.',
            )}
          </DialogDescription>
        </div>
      </div>

      {/* Card 1: Details & Access */}
      <div className="p-3 border border-accent/60 rounded-md bg-level-1 space-y-3 shadow-xs">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-text-main pb-1 border-b border-accent/40">
          <PencilLine className="size-4 text-accent" />
          <span>
            {t('playlistSettings.details.title', 'Playlist Details & Access')}
          </span>
        </div>

        {/* Name */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-text-main">
              {t('playlistSettings.details.name')}
            </Label>
            <span className="text-[10px] text-text-placeholder">
              {name.length}/{MAX_NAME_LENGTH}
            </span>
          </div>
          <Input
            type="text"
            name="name"
            value={name}
            onChange={(e) => {
              const value = e.target.value
              if (value.length > MAX_NAME_LENGTH) {
                toast.error(t('playlistSettings.details.nameTooLong'))
                return
              }
              if (!value.trim()) {
                toast.error(t('playlistSettings.details.nameRequired'))
                return
              }
              setName(value)
              patchDebounced(playlist.id, { name: value })
            }}
            placeholder={t('playlistSettings.details.namePlaceholder')}
            maxLength={MAX_NAME_LENGTH}
            className="bg-level-2 border-0 h-8 px-2.5 text-xs sm:text-sm focus-visible:ring-1 focus-visible:ring-accent/50"
          />
        </div>

        {/* Description */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-text-main">
              {t('playlistSettings.details.description')}
            </Label>
            <span className="text-[10px] text-text-placeholder">
              {description.length}/{MAX_DESCRIPTION_LENGTH}
            </span>
          </div>
          <Textarea
            name="description"
            value={description}
            onChange={(e) => {
              const value = e.target.value
              if (value.length > MAX_DESCRIPTION_LENGTH) {
                toast.error(t('playlistSettings.details.descriptionTooLong'))
                return
              }
              setDescription(value)
              patchDebounced(playlist.id, { description: value })
            }}
            placeholder={t('playlistSettings.details.descriptionPlaceholder')}
            maxLength={MAX_DESCRIPTION_LENGTH}
            rows={2}
            className="bg-level-2 border-0 p-2 text-xs sm:text-sm focus-visible:ring-1 focus-visible:ring-accent/50 resize-none min-h-[55px]"
          />
        </div>

        {/* Mode & Privacy Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          {/* Mode Switcher */}
          <div className="flex items-center justify-between gap-2 p-2 rounded-md bg-level-2/60">
            <div className="min-w-0 flex-1">
              <Label className="text-xs font-semibold text-text-main truncate block">
                {t('playlistSettings.basic.modeTitle')}
              </Label>
              <span className="text-[10px] text-text-secondary truncate block">
                {t(`playlistSettings.basic.mode.${playlist.mode}`)}
              </span>
            </div>
            <div className="flex gap-1 shrink-0">
              {(['static', 'stream'] as Array<PlaylistMode>).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    patchNow(playlist.id, { mode: m })
                    setPlstMode(m)
                  }}
                  className={cn(
                    filterTabBaseClass,
                    'px-2.5 py-1 text-xs font-semibold h-7',
                    playlist.mode === m
                      ? filterTabActiveClass
                      : filterTabInactiveClass,
                  )}
                >
                  {t(`playlistSettings.basic.mode.${m}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Privacy Switcher */}
          <div className="flex items-center justify-between gap-2 p-2 rounded-md bg-level-2/60">
            <div className="min-w-0 flex-1">
              <Label className="text-xs font-semibold text-text-main truncate block">
                {t('playlistSettings.basic.privacy')}
              </Label>
              <span className="text-[10px] text-text-secondary truncate block">
                {isPublic
                  ? t('playlistSettings.basic.public')
                  : t('playlistSettings.basic.private')}
              </span>
            </div>
            <div className="shrink-0 flex items-center">
              <ContentSwitch
                leftLabel={
                  <Label
                    htmlFor="public-id"
                    className="cursor-pointer text-xs font-semibold"
                  >
                    {t('playlistSettings.basic.public')}
                  </Label>
                }
                rightLabel={
                  <Label
                    htmlFor="private-id"
                    className="cursor-pointer text-xs font-semibold"
                  >
                    {t('playlistSettings.basic.private')}
                  </Label>
                }
                onChange={(value) => {
                  patchNow(playlist.id, {
                    is_public: value !== 'right',
                  })
                  setIsPublic(value !== 'right')
                }}
                defaultValue={isPublic ? 'left' : 'right'}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Card 2: Execution Rules, Widget & Sources */}
      <div className="p-3 border border-accent/60 rounded-md bg-level-1 space-y-3 shadow-xs">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-text-main pb-1 border-b border-accent/40">
          <Sliders className="size-4 text-accent" />
          <span>
            {t('playlistSettings.basic.priorityAndWidget', 'Priority & Widget')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Priority Breakpoint */}
          <div className="flex items-center justify-between gap-2 p-2 rounded-md bg-level-2/60">
            <div className="min-w-0 flex-1">
              <Label className="text-xs font-semibold text-text-main truncate block">
                {t('playlistSettings.basic.breakPoint')}
              </Label>
            </div>
            <div className="flex rounded-[--rounded-std] items-center overflow-hidden h-7 shrink-0">
              <Input
                id="break-point-id"
                type="number"
                ref={breakPointRef}
                min={0}
                dir="rtl"
                value={activeModeSettings.priority_break_point}
                className="border-0 bg-level-2 focus-visible:ring-0 rounded-r-none px-1.5 text-xs h-7 w-20 [appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none"
                onChange={(e) => {
                  const value = Math.max(0, Number(e.target.value) || 0)
                  patchDebounced(playlist.id, {
                    mode_settings: {
                      ...playlist.mode_settings,
                      [plstMode]: {
                        ...activeModeSettings,
                        priority_break_point: value,
                      },
                    },
                  })
                }}
              />
              <UpDownBtn
                getInputRef={() => breakPointRef.current}
                className="rounded-r-[--rounded-std] rounded-l-none overflow-clip h-7"
              />
            </div>
          </div>

          {/* Priority Calculation Mode */}
          <div className="flex items-center justify-between gap-2 p-2 rounded-md bg-level-2/60">
            <div className="min-w-0 flex-1">
              <Label className="text-xs font-semibold text-text-main truncate block">
                {t('playlistSettings.basic.priorityMode')}
              </Label>
            </div>
            <div className="shrink-0 flex items-center">
              <ContentSwitch
                leftLabel={
                  <Label
                    htmlFor="max-id"
                    className="cursor-pointer text-xs font-semibold"
                  >
                    {t('playlistSettings.basic.priorityModeMax')}
                  </Label>
                }
                rightLabel={
                  <Label
                    htmlFor="add-id"
                    className="cursor-pointer text-xs font-semibold"
                  >
                    {t('playlistSettings.basic.priorityModeAdd')}
                  </Label>
                }
                onChange={(value) => {
                  patchDebounced(playlist.id, {
                    cost_mode: value === 'right' ? 'add' : 'max',
                  })
                  setPriorityMode(value === 'right' ? 'add' : 'max')
                }}
                defaultValue={playlist.cost_mode === 'max' ? 'left' : 'right'}
              />
            </div>
          </div>

          {/* Max Playlist Size */}
          <div className="flex items-center justify-between gap-2 p-2 rounded-md bg-level-2/60 sm:col-span-2">
            <div className="min-w-0 flex-1">
              <Label className="text-xs font-semibold text-text-main truncate block">
                {t('playlistSettings.basic.maxPlaylistSize')}
              </Label>
              <span className="text-[10px] text-text-placeholder truncate block">
                {t('playlistSettings.basic.maxPlaylistSizeHint')}
              </span>
            </div>
            <div className="flex rounded-[--rounded-std] items-center overflow-hidden h-7 shrink-0">
              <Input
                id="max-playlist-size-id"
                type="number"
                ref={maxPlaylistSizeRef}
                min={0}
                dir="rtl"
                value={playlist.max_playlist_size ?? 0}
                className="border-0 bg-level-2 focus-visible:ring-0 rounded-r-none px-1.5 text-xs h-7 w-20 [appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none"
                onChange={(e) => {
                  const value = Math.max(0, Number(e.target.value) || 0)
                  patchDebounced(playlist.id, {
                    max_playlist_size: value,
                  })
                }}
              />
              <UpDownBtn
                getInputRef={() => maxPlaylistSizeRef.current}
                className="rounded-r-[--rounded-std] rounded-l-none overflow-clip h-7"
              />
            </div>
          </div>
        </div>

        {/* Show in Widget - Dedicated full-width row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-md bg-level-2/60">
          <div className="min-w-0 flex-1">
            <Label className="text-xs font-semibold text-text-main">
              {t('playlistSettings.basic.showInWidget')}
            </Label>
          </div>
          <div className="shrink-0 flex items-center self-end sm:self-auto">
            <ContentSwitch
              leftLabel={
                <Label
                  htmlFor="widget-no-id"
                  className="cursor-pointer text-xs font-semibold"
                >
                  {t('playlistSettings.basic.showInWidgetNo')}
                </Label>
              }
              rightLabel={
                <Label
                  htmlFor="widget-yes-id"
                  className="cursor-pointer text-xs font-semibold"
                >
                  {t('playlistSettings.basic.showInWidgetYes')}
                </Label>
              }
              onChange={(value) => {
                patchDebounced(playlist.id, {
                  show_in_widget: value === 'right',
                })
                setShowInWidget(value === 'right')
              }}
              defaultValue={playlist.show_in_widget ? 'right' : 'left'}
            />
          </div>
        </div>
      </div>

      {/* Background Tracks (Stream mode) */}
      {plstMode === 'stream' && (
        <div className="pt-2 border-t border-accent/40 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-text-main">
            <Music className="size-3.5 text-accent" />
            <span>{t('playlistSettings.basic.backgroundTracks')}</span>
          </div>
          {playlist.track_data.length === 0 ? (
            <div className="p-3 border border-dashed border-accent/60 rounded-md bg-level-1/50 text-center">
              <p className="text-xs text-text-secondary">
                {t('playlistSettings.basic.backgroundTracksEmpty')}
              </p>
            </div>
          ) : (
            <div className="grid gap-1.5 max-h-40 overflow-y-auto pr-1">
              {playlist.track_data.map((track) => {
                const isBackground = playlist.background_track_ids.includes(
                  track.id,
                )
                return (
                  <div
                    key={track.id}
                    className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md bg-level-2/80 hover:bg-level-2 transition-colors cursor-pointer text-xs"
                    onClick={() => {
                      const nextIds = isBackground
                        ? playlist.background_track_ids.filter(
                            (id: string) => id !== track.id,
                          )
                        : [...playlist.background_track_ids, track.id]

                      patchDebounced(playlist.id, {
                        background_track_ids: nextIds,
                      })
                    }}
                  >
                    <Checkbox
                      checked={isBackground}
                      onCheckedChange={() => {}}
                      className="size-4 shrink-0 rounded border-accent cursor-pointer"
                    />
                    <span className="font-medium text-text-main truncate">
                      {track.title}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* External Sources */}
      <div className="pt-2 border-t border-accent/40 space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-text-main">
          <Share2 className="size-3.5 text-accent" />
          <span>{t('playlistSettings.basic.externalSources')}</span>
        </div>

        {isLoadingIntegrations ? (
          <div className="p-3 border border-dashed border-accent/60 rounded-md bg-level-1/50 text-center">
            <p className="text-xs text-text-secondary">
              {t('playlistSettings.basic.integrationsLoading')}
            </p>
          </div>
        ) : integrations.length === 0 ? (
          <div className="p-3 border border-dashed border-accent/60 rounded-md bg-level-1/50 text-center">
            <p className="text-xs text-text-secondary">
              {t('playlistSettings.basic.integrationsEmpty')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {integrations.map((integration) => {
              if (
                !Object.values(ExternalContentPlatform).includes(
                  integration.platform,
                )
              )
                return null

              const selected = isSourceSelected(
                integration.platform,
                integration.platform_user_id,
              )

              return (
                <div
                  key={`${integration.platform}-${integration.platform_user_id}`}
                  className="flex items-center gap-2.5 p-2 rounded-md bg-level-2/80 hover:bg-level-2 transition-colors cursor-pointer text-xs"
                  onClick={() =>
                    handleSourceToggle(
                      integration.platform,
                      integration.platform_user_id,
                    )
                  }
                >
                  <Checkbox
                    checked={selected}
                    onCheckedChange={() =>
                      handleSourceToggle(
                        integration.platform,
                        integration.platform_user_id,
                      )
                    }
                    className="size-4 shrink-0 rounded border-accent cursor-pointer"
                  />

                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="flex size-6 shrink-0 items-center justify-center rounded bg-level-1 text-accent">
                      {getPlatformIcon(integration.platform)}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-text-main truncate">
                        {getPlatformDisplayName(integration.platform)}
                      </span>
                      <span className="text-[10px] text-text-secondary truncate">
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
  )
}

export default TabBasic
