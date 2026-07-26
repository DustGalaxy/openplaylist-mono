// src/features/playlist-settings/components/playlist-settings/ContentSettingsSection.tsx
import React from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import type { ContentSettings, Platform } from '@/types/playlist'
import { Label } from '@/components/ui/label'
import { DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import UpDownBtn from '@/components/ui/funny-btn'
import Btn from '@/components/ui/my-btn'
import { usePlaylistViewLoaded } from '@/features/united-playlist/context/playlist-view-context'
import { usePlaylistStore } from '@/stores/playlistStore'

export default function ContentSettingsSection({
  platform,
}: {
  platform: Platform
}) {
  const { t } = useTranslation()
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
      <div>
        <Label className="text-lg">
          {t('playlistSettings.validation.tabtitle')}
        </Label>
        <Label>{t('playlistSettings.validation.notInitialized')}</Label>
        <div className="h-3" />
        <Btn onClick={handleInit} className="px-2">
          {t('playlistSettings.validation.notInitialized')}
        </Btn>
      </div>
    )
  }

  const numberField = (
    field: keyof ContentSettings,
    labelKey: string,
    descKey?: string,
  ) => (
    <div key={field}>
      <div className="flex justify-between gap-2 items-center">
        <Label className="text-lg">{t(labelKey)}</Label>
        <div className="flex rounded-(--rounded-std) items-center gap-0 overflow-hidden">
          <Input
            type="number"
            ref={(el) => {
              controlsRef.current[field] = el
            }}
            value={rules[field] as number}
            dir="rtl"
            className="border-0 bg-level-2 w-30 focus-visible:ring-0 rounded-r-none [appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none"
            onChange={(e) => handleChange(field, e.target.value)}
          />
          <UpDownBtn getInputRef={() => controlsRef.current[field]} />
        </div>
      </div>
      {descKey && <DialogDescription>{t(descKey)}</DialogDescription>}
    </div>
  )

  return (
    <div>
      <Label className="text-lg">
        {t('playlistSettings.validation.tabtitle')}
      </Label>
      <p className="h-3" />
      {numberField('min_views', 'playlistSettings.validation.minViews')}
      {numberField(
        'min_likes',
        'playlistSettings.validation.minLikes',
        'playlistSettings.validation.minViewsDesc',
      )}
      {numberField('max_duration', 'playlistSettings.validation.maxDuration')}
      {numberField(
        'track_cooldown',
        'playlistSettings.validation.trackCooldown',
        'playlistSettings.validation.trackCooldownDesc',
      )}
      {numberField('user_cooldown', 'playlistSettings.validation.userCooldown')}
    </div>
  )
}
