import React from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Label } from '@/components/ui/label'
import { DialogDescription } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

import PlatformSettingsEditor from './platformValidationTab'
import type {
  ClientPlaylist,
  ContentSettings,
  PlaylistSettings,
} from '@/types/playlist'
import { Platform } from '@/types/playlist'
import { initPlatformContent } from '@/api/settings/content'

const TabValidation = ({
  playlist,
  setSettings,
  settings,
}: {
  playlist: ClientPlaylist
  setSettings: React.Dispatch<React.SetStateAction<PlaylistSettings>>
  settings: PlaylistSettings
}) => {
  const { t } = useTranslation()
  const [rules, setRules] = React.useState<
    Record<Platform, ContentSettings | null>
  >(() => {
    // Создаем пустую заготовку на основе Enum
    const initial = {} as Record<Platform, ContentSettings | null>

    // Заполняем данными из playlistSettings.content_rules или дефолтными значениями
    Object.values(Platform).forEach((p) => {
      initial[p] =
        settings.content_settings.find((r) => r.platform === p) || null
    })

    return initial
  })

  const updateRule = React.useCallback(
    (platform: Platform, field: keyof ContentSettings, value: any) => {
      setRules((prev) => ({
        ...prev,
        [platform]: {
          ...prev[platform],
          [field]: value,
        },
      }))
    },
    [],
  )

  const initSection = (platform: Platform) => {
    const newRule = {
      platform,
      settings_id: settings.id,
      playlist_id: playlist.id,
    }

    initPlatformContent(newRule).then((res) => {
      if (res) {
        setRules((prev) => ({
          ...prev,
          [platform]: res,
        }))
      } else {
        toast.error(t('playlistSettings.validation.initFailed'))
      }
    })
  }
  return (
    <div>
      <div className="gap-1 flex flex-col">
        <Label className=" text-xl">{t('playlistSettings.validation.title')}</Label>
        <DialogDescription>
          Video validation settings. Can`t be negtive.
        </DialogDescription>
        <Tabs
          orientation="vertical"
          defaultValue={Platform.General}
          className="w-full h-full flex flex-row gap-4"
        >
          <TabsList className="flex flex-col h-full items-start">
            {Object.entries(Platform).map(([key, val], i) => (
              <TabsTrigger key={key} value={val} className="  w-full">
                <Label className="w-full text-lg text-left">{key}</Label>
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(Platform).map(([key, val], i) => (
            <PlatformSettingsEditor
              platform={val}
              platformKey={key}
              rules={rules[val]}
              playlist_id={playlist.id}
              updateRule={updateRule}
              initSection={initSection}
            />
          ))}
        </Tabs>

        {/* <div className="flex justify-between gap-2 items-center">
          <Label className="text-lg">Donation currency amount</Label>
          <div className="flex rounded-(--rounded-std) items-center gap-0 overflow-hidden">
            <Input
              type="number"
              dir="rtl"
              value={donationCurrencyAmount}
              ref={donationCurrencyAmountRef}
              className="border-0 bg-level-2 w-30 focus-visible:ring-0 rounded-r-none
                [appearance:textfield] 
                [&::-webkit-inner-spin-button]:m-0 
                [&::-webkit-inner-spin-button]:appearance-none 
                [&::-webkit-outer-spin-button]:m-0 
                [&::-webkit-outer-spin-button]:appearance-none
                "
              onChange={(e) => {
                if (
                  isNaN(parseInt(e.target.value)) ||
                  parseInt(e.target.value) < 0
                )
                  return
                setDonationCurrencyAmount(parseInt(e.target.value))
                setSettings({
                  ...settings,
                  donation_currency_amount: parseInt(e.target.value),
                })
                canRequest.current = true
              }}
            />
            <UpDownBtn inputRef={donationCurrencyAmountRef} />
          </div>
        </div> */}

        {/* <DialogDescription>
          Please indicate the amount in the currency in which you accept
          donations. (Needs donation platform integration)
        </DialogDescription> */}
      </div>
    </div>
  )
}

export default TabValidation
