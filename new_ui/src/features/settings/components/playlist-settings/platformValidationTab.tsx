import React from 'react'
import { useTranslation } from 'react-i18next'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import MyBtn from '@/components/ui/my-btn'
import { Input } from '@/components/ui/input'
import UpDownBtn from '@/components/ui/funny-btn'
import { DialogDescription } from '@/components/ui/dialog'
import type { ContentSettings, Platform } from '@/types/playlist'
import { useDebouncedEffect } from '@/hooks/useDeboucedEffect'
import { updateContent } from '@/api/settings/content'

interface PlatformSettingsProps {
  platform: Platform
  platformKey: string
  rules: ContentSettings | null
  playlist_id: string
  updateRule: (
    platform: Platform,
    field: keyof ContentSettings,
    value: any,
  ) => void
  initSection: (platform: Platform) => void
}

const PlatformSettingsEditor = React.memo(
  ({
    platform,
    platformKey,
    rules,
    playlist_id,
    updateRule,
    initSection,
  }: PlatformSettingsProps) => {
    const { t } = useTranslation()
    // Локальные рефы для кнопок UpDown внутри одной платформы
    const controlsRef = React.useRef<Record<string, HTMLInputElement | null>>(
      {},
    )

    const canRequest = React.useRef(false)
    // Вызываем дебаунс только для этой платформы
    useDebouncedEffect(
      rules,
      () => {
        if (rules && canRequest.current) {
          canRequest.current = false
          console.log(`Saving settings for ${platform}...`, rules)
          updateContent({ playlist_id, data: rules }) // Ваша функция API для сохранения
        }
      },
      3000,
    )

    if (!rules) {
      return (
        <TabsContent value={platform}>
          <Label className="text-lg">{platformKey} validation</Label>
          <Label>{t('playlistSettings.validation.notInitialized')}</Label>
          <div className="h-3" />
          <MyBtn
            text={t('playlistSettings.validation.notInitialized')}
            onClick={() => initSection(platform)}
            className="px-2"
          />
        </TabsContent>
      )
    }

    const handleInputChange = (field: keyof ContentSettings, val: string) => {
      const num = parseInt(val)
      if (isNaN(num) || num < 0) return

      canRequest.current = true
      updateRule(platform, field, num)
    }

    return (
      <TabsContent key={platformKey} value={platform}>
        <Label className=" text-lg">{platformKey} validation</Label>
        <p className="h-3"></p>
        <div className="flex justify-between gap-2 items-center">
          <Label className=" text-lg">{t('playlistSettings.validation.minViews')}</Label>
          <div className="flex rounded-(--rounded-std) items-center gap-0 overflow-hidden">
            <Input
              type="number"
              ref={(el) => {
                controlsRef.current['min_views'] = el
              }}
              value={rules.min_views}
              dir="rtl"
              className="border-0 bg-level-2 w-30 focus-visible:ring-0 rounded-r-none
                [appearance:textfield] 
                [&::-webkit-inner-spin-button]:m-0 
                [&::-webkit-inner-spin-button]:appearance-none 
                [&::-webkit-outer-spin-button]:m-0 
                [&::-webkit-outer-spin-button]:appearance-none
                "
              onChange={(e) => handleInputChange('min_views', e.target.value)}
            />
            <UpDownBtn getInputRef={() => controlsRef.current['min_views']} />
          </div>
        </div>
        <div className="flex justify-between gap-2 items-center">
          <Label className=" text-lg">{t('playlistSettings.validation.minLikes')}</Label>
          <div className="flex rounded-(--rounded-std) items-center gap-0 overflow-hidden">
            <Input
              type="number"
              value={rules.min_likes}
              ref={(el) => {
                controlsRef.current['min_likes'] = el
              }}
              dir="rtl"
              className="border-0 bg-level-2 w-30 focus-visible:ring-0 rounded-r-none
                [appearance:textfield] 
                [&::-webkit-inner-spin-button]:m-0 
                [&::-webkit-inner-spin-button]:appearance-none 
                [&::-webkit-outer-spin-button]:m-0 
                [&::-webkit-outer-spin-button]:appearance-none
                "
              onChange={(e) => handleInputChange('min_likes', e.target.value)}
            />
            <UpDownBtn getInputRef={() => controlsRef.current['min_likes']} />
          </div>
        </div>
        <DialogDescription>
          Not every video can have likes. 0 means all videos will pass likes
          validation.
        </DialogDescription>
        <div className="flex justify-between gap-2 items-center">
          <Label className=" text-lg">{t('playlistSettings.validation.maxDuration')}</Label>
          <div className="flex rounded-(--rounded-std) items-center gap-0 overflow-hidden">
            <Input
              type="number"
              value={rules.max_duration}
              ref={(el) => {
                controlsRef.current['max_duration'] = el
              }}
              dir="rtl"
              className="border-0 bg-level-2 w-30 focus-visible:ring-0 rounded-r-none
                        [appearance:textfield] 
                        [&::-webkit-inner-spin-button]:m-0 
                        [&::-webkit-inner-spin-button]:appearance-none 
                        [&::-webkit-outer-spin-button]:m-0 
                        [&::-webkit-outer-spin-button]:appearance-none
                        "
              onChange={(e) =>
                handleInputChange('max_duration', e.target.value)
              }
            />
            <UpDownBtn
              getInputRef={() => controlsRef.current['max_duration']}
            />
          </div>
        </div>

        <div className="flex justify-between gap-2 items-center">
          <Label className=" text-lg">{t('playlistSettings.validation.trackCooldown')}</Label>
          <div className="flex rounded-(--rounded-std) items-center gap-0 overflow-hidden">
            <Input
              type="number"
              value={rules.track_cooldown}
              ref={(el) => {
                controlsRef.current['track_cooldown'] = el
              }}
              dir="rtl"
              className="border-0 bg-level-2 w-30 focus-visible:ring-0 rounded-r-none
                        [appearance:textfield] 
                        [&::-webkit-inner-spin-button]:m-0 
                        [&::-webkit-inner-spin-button]:appearance-none 
                        [&::-webkit-outer-spin-button]:m-0 
                        [&::-webkit-outer-spin-button]:appearance-none
                        "
              onChange={(e) =>
                handleInputChange('track_cooldown', e.target.value)
              }
            />
            <UpDownBtn
              getInputRef={() => controlsRef.current['track_cooldown']}
            />
          </div>
        </div>

        <DialogDescription>
          The time after which a track can be added again.
        </DialogDescription>

        <div className="flex justify-between gap-2 items-center">
          <Label className=" text-lg">{t('playlistSettings.validation.userCooldown')}</Label>
          <div className="flex rounded-(--rounded-std) items-center gap-0 overflow-hidden">
            <Input
              type="number"
              value={rules.user_cooldown}
              ref={(el) => {
                controlsRef.current['user_cooldown'] = el
              }}
              dir="rtl"
              className="border-0 bg-level-2 w-30 focus-visible:ring-0 rounded-r-none
                        [appearance:textfield] 
                        [&::-webkit-inner-spin-button]:m-0 
                        [&::-webkit-inner-spin-button]:appearance-none 
                        [&::-webkit-outer-spin-button]:m-0 
                        [&::-webkit-outer-spin-button]:appearance-none
                        "
              onChange={(e) =>
                handleInputChange('user_cooldown', e.target.value)
              }
            />
            <UpDownBtn
              getInputRef={() => controlsRef.current['user_cooldown']}
            />
          </div>
        </div>
      </TabsContent>
    )
  },
)
PlatformSettingsEditor.displayName = 'PlatformSettingsEditor'
export default PlatformSettingsEditor
