// src/features/playlist-settings/components/playlist-settings/ContentSettingsSection.tsx
import React from 'react'
import {
  Clock,
  Eye,
  Info,
  ShieldCheck,
  Sliders,
  ThumbsUp,
  Timer,
  UserCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import type { ContentSettings, Platform } from '@/types/playlist'
import { Label } from '@/components/ui/label'
import { DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import UpDownBtn from '@/components/ui/funny-btn'
import Btn from '@/components/ui/my-btn'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { usePlaylistViewLoaded } from '@/features/united-playlist/context/playlist-view-context'
import { usePlaylistStore } from '@/stores/playlistStore'
import { useFeatureTranslation } from '@/lib/i18n/featureTranslation'

export default function ContentSettingsSection({
  platform,
}: {
  platform: Platform
}) {
  const { t } = useFeatureTranslation()
  const { playlist } = usePlaylistViewLoaded()
  const { initContentSettings, updateContentSettings } = usePlaylistStore()
  const controlsRef = React.useRef<Record<string, HTMLInputElement | null>>({})

  const rules =
    playlist.content_settings.find((c) => c.platform === platform) ?? null

  const handleInit = async () => {
    const res = await initContentSettings(playlist.id, platform)
    if (!res) toast.error(t('playlistSettings.validation.initFailed'))
  }

  const handleChange = (field: keyof ContentSettings, val: string) => {
    if (!rules) return
    const num = parseInt(val)
    if (isNaN(num) || num < 0) return
    updateContentSettings(playlist.id, { ...rules, [field]: num })
  }

  if (!rules) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-level-1 border border-level-3/40 text-level-3 mt-0.5">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <Label className="text-base font-bold text-text-main">
              {t(
                'playlistSettings.validation.title',
                'Content validation rules',
              )}
            </Label>
            <DialogDescription className="text-xs text-text-secondary mt-0.5">
              {t(
                'playlistSettings.validation.description',
                'Set limits for views, likes, duration, and cooldowns.',
              )}
            </DialogDescription>
          </div>
        </div>

        <div className="p-6 border border-dashed border-level-3/60 rounded-md bg-level-1/50 text-center flex flex-col items-center gap-3">
          <Sliders className="size-8 text-text-placeholder" strokeWidth={1.5} />
          <div>
            <p className="text-xs font-semibold text-text-main">
              {t(
                'playlistSettings.validation.notInitialized',
                'Section not initialized',
              )}
            </p>
            <p className="text-[11px] text-text-secondary mt-0.5">
              {t(
                'playlistSettings.validation.initHint',
                'Initialize validation rules for this platform to start configuring thresholds.',
              )}
            </p>
          </div>
          <Btn
            onClick={handleInit}
            className="h-9 px-4 bg-level-2 text-xs font-semibold text-text-main hover:bg-level-3 transition-colors"
          >
            {t(
              'playlistSettings.validation.initRules',
              'Initialize validation rules',
            )}
          </Btn>
        </div>
      </div>
    )
  }

  const fieldsConfig: Array<{
    field: keyof ContentSettings
    labelKey: string
    descKey?: string
    icon: React.ElementType
    unit?: string
  }> = [
    {
      field: 'min_views',
      labelKey: 'playlistSettings.validation.minViews',
      icon: Eye,
    },
    {
      field: 'min_likes',
      labelKey: 'playlistSettings.validation.minLikes',
      descKey: 'playlistSettings.validation.minViewsDesc',
      icon: ThumbsUp,
    },
    {
      field: 'max_duration',
      labelKey: 'playlistSettings.validation.maxDuration',
      icon: Clock,
      unit: 'sec',
    },
    {
      field: 'track_cooldown',
      labelKey: 'playlistSettings.validation.trackCooldown',
      descKey: 'playlistSettings.validation.trackCooldownDesc',
      icon: Timer,
      unit: 'sec',
    },
    {
      field: 'user_cooldown',
      labelKey: 'playlistSettings.validation.userCooldown',
      icon: UserCheck,
      unit: 'sec',
    },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-2.5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-level-1 border border-level-3/40 text-level-3 mt-0.5">
          <ShieldCheck className="size-5" />
        </div>
        <div>
          <Label className="text-base font-bold text-text-main">
            {t('playlistSettings.validation.title', 'Video Validation')}
          </Label>
          <DialogDescription className="text-xs text-text-secondary mt-0.5">
            {t(
              'playlistSettings.validation.description',
              'Validation settings for video. Cannot be negative.',
            )}
          </DialogDescription>
        </div>
      </div>

      {/* Rules List */}
      <div className="grid gap-2">
        {fieldsConfig.map(({ field, labelKey, descKey, icon: Icon, unit }) => {
          const description = descKey ? t(descKey) : undefined
          return (
            <div
              key={field}
              className="p-2.5 sm:p-3 border border-level-3/60 rounded-md bg-level-1 hover:border-level-3/80 transition-all flex items-center justify-between gap-3 shadow-xs"
            >
              {/* Left Info */}
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-level-2 border border-level-3/40 text-level-3">
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs sm:text-sm font-semibold text-text-main truncate">
                      {t(labelKey)}
                    </Label>
                    {unit && (
                      <span className="text-[10px] px-1.5 py-0.2 bg-level-2 border border-level-3/40 rounded-full text-text-secondary">
                        {unit}
                      </span>
                    )}
                    {description && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="size-3.5 text-text-placeholder hover:text-text-secondary cursor-help shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          className="bg-level-2 text-text-main border-level-3/40 border text-xs max-w-xs"
                        >
                          <p>{description}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  {description && (
                    <p className="text-[11px] text-text-secondary truncate mt-0.5 hidden sm:block">
                      {description}
                    </p>
                  )}
                </div>
              </div>

              {/* Right Control */}
              <div className="flex rounded-[--rounded-std] items-center overflow-hidden h-8 shrink-0">
                <Input
                  type="number"
                  ref={(el) => {
                    controlsRef.current[field] = el
                  }}
                  value={(rules[field] as number) ?? 0}
                  dir="rtl"
                  className="border-0 bg-level-2 focus-visible:ring-0 rounded-r-none px-1.5 text-xs sm:text-sm h-8 w-16 sm:w-20 [appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none"
                  onChange={(e) => handleChange(field, e.target.value)}
                />
                <UpDownBtn
                  getInputRef={() => controlsRef.current[field]}
                  className="rounded-r-[--rounded-std] rounded-l-none overflow-clip h-8"
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
