// src/features/playlist-settings/components/playlist-settings/TabPlatforms.tsx
import { useTranslation } from 'react-i18next'
import { PLATFORM_CAPABILITIES } from '../lib/platformCapabilities'
import PlatformSettingsPanel from './PlatformSettingsPanel'
import { Platform } from '@/types/playlist'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'

export default function TabPlatforms() {
  const { t } = useTranslation()

  return (
    <div>
      <Tabs
        defaultValue={Platform.General}
        className="w-full h-full flex flex-col md:flex-row gap-4 md:gap-6"
      >
        <TabsList className="flex flex-row md:flex-col h-auto md:h-full w-full md:w-auto overflow-x-auto md:overflow-x-visible justify-start items-center md:items-start p-1 no-scrollbar">
          {Object.values(Platform).map((platform) => {
            const caps = PLATFORM_CAPABILITIES[platform]
            return (
              <TabsTrigger
                key={platform}
                value={platform}
                className="w-auto md:w-full shrink-0 ring-0 data-[state=active]:ring-2 data-[state=active]:bg-level-2 ring-level-3"
              >
                <div className="w-full flex items-center gap-2 text-left cursor-pointer">
                  {caps.icon}
                  <Label className="text-sm md:text-base cursor-pointer whitespace-nowrap">
                    {t(caps.labelKey)}
                  </Label>
                </div>
              </TabsTrigger>
            )
          })}
        </TabsList>

        <div className="flex-1">
          {Object.values(Platform).map((platform) => (
            <TabsContent key={platform} value={platform}>
              <PlatformSettingsPanel platform={platform} />
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  )
}
