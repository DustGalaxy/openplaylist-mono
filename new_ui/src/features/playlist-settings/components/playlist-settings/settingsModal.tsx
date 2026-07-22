import React from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Settings } from 'lucide-react'
import TabValidation from './tabValidation'
import TabBasic from './tabBasic.tsx'
import TabChatPlatformRoles from './tabChatPlatformRoles.tsx'
import TabBlock from './tabBlock'
import TabDonation from './tabDonation.tsx'
import type { PlaylistPatch, PlaylistSettings } from '@/types/playlist'
import type { Playlist } from '@/stores/playlistStore/types'
import { Label } from '@/components/ui/label'
import Btn from '@/components/ui/my-btn'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import useMusicStore from '@/stores/musicStore'
import { useDebouncedEffect } from '@/hooks/useDeboucedEffect'
import { usePlaylistView } from '@/features/united-playlist/context/playlist-view-context.tsx'
import { useUserPlaylistRecordsStore } from '@/stores/userPlaylistInfoStore.ts'

export default function SettingsModal() {
  const { t } = useTranslation()
  const { playlist } = usePlaylistView()
  const [settings, setSettings] = React.useState<PlaylistSettings>()
  const [plst, setPlst] = React.useState<Playlist | undefined>(playlist)

  const [countToDelete, setCountToDelete] = React.useState(3)
  const [deleteTimeout, setDeleteTimeout] = React.useState(false)

  const { requestPlSettings, requestPlaylistPatch } = useMusicStore()

  React.useEffect(() => {
    if (!playlist) return
    setSettings(playlist.settings)
    setPlst(playlist)
  }, [playlist])

  const canPatchSettings = React.useRef(false)
  useDebouncedEffect(
    settings,
    async () => {
      if (!canPatchSettings.current || !settings || !playlist) return
      canPatchSettings.current = false
      try {
        await requestPlSettings(playlist.id, settings)
        toast.success(t('playlistSettings.toast.settingsSaved'))
      } catch (err) {
        toast.error(t('playlistSettings.toast.settingsFailed'))
      }
    },
    2000,
  )

  const canPatchPlaylist = React.useRef(false)
  useDebouncedEffect(
    plst,
    async () => {
      if (!canPatchPlaylist.current || !plst) return
      canPatchPlaylist.current = false
      try {
        const obj: PlaylistPatch = {
          name: plst.name,
          description: plst.description,
          is_public: plst.is_public,
          is_favorite: plst.is_favorite,
          is_allow_external_requests: plst.is_allow_external_requests,
          allow_sources: plst.allow_sources,
          show_in_widget: plst.show_in_widget,
          tags: plst.tags,
        }
        await requestPlaylistPatch(plst.id, obj)
        toast.success(t('playlistSettings.toast.playlistSaved'))
      } catch (err) {
        toast.error(t('playlistSettings.toast.playlistFailed'))
      }
    },
    2000,
  )

  const retroTabStyles = `
    bg-level-2 data-[state=active]:bg-level-2 border-2 justify-start
    ring-1 ring-level-3/40
    shadow-[0_3px_0_0_var(--color-level-3),0_4px_5px_-1px_rgba(0,0,0,0.5)] 
    sm:shadow-[0_3px_0_0_var(--color-level-3),0_5px_8px_-1px_rgba(0,0,0,0.55)]
    
    hover:shadow-[0_3px_0_0_var(--color-level-3),0_0px_15px_rgba(255,255,255,0.25),0_4px_8px_rgba(255,255,255,0.15)]
    hover:text-shadow-[0_0_4px_rgba(255,255,255,0.8),_0_0_25px_rgba(255,255,255,0.4)]
    hover:[&_svg]:drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]

    disabled:cursor-not-allowed
    disabled:opacity-50
    disabled:shadow-none
    disabled:hover:shadow-none
    disabled:hover:text-shadow-none
    disabled:[&_svg]:drop-shadow-none
    disabled:data-[state=active]:shadow-none
    disabled:data-[state=active]:translate-y-0

    transform translate-y-0 transition-all duration-100
    data-[state=active]:translate-y-[3px]
    sm:data-[state=active]:translate-y-[5px]
    data-[state=active]:shadow-[0_0px_0_0_var(--color-level-3),0_0px_3px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.05)]
  `
  if (!plst) {
    return
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Btn
          title={t('playlistSettings.title')}
          className=" p-1 bg-level-2 size-8 rounded-sm"
          onClick={() => setCountToDelete(3)}
        >
          <Settings className="size-5" />
        </Btn>
      </DialogTrigger>
      <DialogContent
        className="fixed 
      top-10! bottom-10! left-0! right-0! translate-x-0! translate-y-0! w-screen max-w-full px-1 sm:px-4 h-screen max-h-[90vh] 
      sm:top-[50%]! sm:left-[50%]! sm:-translate-x-1/2! sm:-translate-y-1/2! 
      sm:max-w-6xl sm:h-[80vh] rounded-t-xl sm:rounded-xl bg-level-1 border-level-3 text-text-main flex flex-col overflow-auto"
      >
        <Tabs className="min-w-full flex justify-start ">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {t('playlistSettings.title')}
            </DialogTitle>
            <DialogDescription>
              {t('playlistSettings.description')}
            </DialogDescription>
          </DialogHeader>

          <TabsList
            defaultValue="general"
            className="w-full grid grid-cols-3 sm:grid-cols-6 font-mono justify-start items-center bg-transparent px-0 mx-0 gap-4 mb-3"
          >
            <TabsTrigger className={retroTabStyles} value="general">
              {t('playlistSettings.tabs.basic')}
            </TabsTrigger>
            <TabsTrigger className={retroTabStyles} value="validation">
              {t('playlistSettings.tabs.validation')}
            </TabsTrigger>
            <TabsTrigger className={retroTabStyles} value="donation">
              {t('playlistSettings.tabs.donation')}
            </TabsTrigger>
            <TabsTrigger className={retroTabStyles} value="chat-roles">
              {t('playlistSettings.tabs.chatRoles')}
            </TabsTrigger>
            <TabsTrigger className={retroTabStyles} value="block">
              {t('playlistSettings.tabs.block')}
            </TabsTrigger>
            <TabsTrigger className={retroTabStyles} value="delete">
              {t('playlistSettings.tabs.delete')}
            </TabsTrigger>
          </TabsList>

          {/* <div className="h-[1px] bg-level-3" /> */}
          <TabsContent key="generaltab" value="general" className="h-full">
            <TabBasic
              playlist={plst}
              setPlst={setPlst}
              canPatchPlaylist={canPatchPlaylist}
              settings={settings}
              setSettings={setSettings}
              canPatchSettings={canPatchSettings}
            />
          </TabsContent>
          <TabsContent key="validationtab" value="validation">
            <TabValidation
              playlist={plst}
              settings={settings}
              setSettings={setSettings}
            />
          </TabsContent>
          <TabsContent key="donationtab" value="donation">
            <TabDonation
              playlist={plst}
              settings={settings}
              setSettings={setSettings}
            />
          </TabsContent>
          <TabsContent key="chatroles" value="chat-roles">
            <TabChatPlatformRoles
              playlist={plst}
              settings={settings}
              setSettings={setSettings}
            />
          </TabsContent>
          <TabsContent key="blocktab" value="block">
            <TabBlock playlist={plst} />
          </TabsContent>
          <TabsContent key="deletetab" value="delete">
            <div className="gap-1 flex justify-between mb-4">
              <Label className="text-red-500 text-xl">
                {t('playlistSettings.delete.title')}
              </Label>
              <div className="flex gap-2">
                <Label className="text-red-500 text-xl"> {countToDelete}</Label>
                <Btn
                  className="bg-level-2"
                  disabled={deleteTimeout || countToDelete === 0}
                  onClick={async () => {
                    if (countToDelete > 1) {
                      setCountToDelete(countToDelete - 1)
                      setDeleteTimeout(true)
                      setTimeout(() => {
                        setDeleteTimeout(false)
                      }, 1000)
                    } else if (countToDelete === 1) {
                      useUserPlaylistRecordsStore().remove(plst.id)

                      setCountToDelete(
                        t('playlistSettings.delete.deleted') as any,
                      )
                      toast.success(
                        t('playlistSettings.toast.playlistDeleted', {
                          name: playlist?.name,
                        }),
                      )
                    } else {
                      setCountToDelete(3)
                    }
                  }}
                >
                  {' '}
                  <div className="py-1 px-2">
                    {t('playlistSettings.delete.button')}
                  </div>
                </Btn>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Delete playlist */}
      </DialogContent>
    </Dialog>
  )
}
