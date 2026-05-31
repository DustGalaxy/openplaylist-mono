import React from 'react'
import { toast } from 'sonner'
import Settings from '@/components/icons/icon-settings'
import { Label } from '@/components/ui/label'
import Btn from '@/components/ui/my-btn'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import TabValidation from './tabValidation'
import TabBasic from './tabBasic.tsx'
import ChatRoles from './tabChatRoles.tsx'
import TabChatPlatformRoles from './tabChatPlatformRoles.tsx'
import TabBlock from './tabBlock'

import TabDonation from './tabDonation.tsx'
import type { ClientPlaylist, PlaylistPatch, PlaylistSettings } from '@/types/playlist'
import { usePlaylist } from '@/features/playlist/context/playlist-context'
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
import { deletePlaylist } from '@/api/api-playlist'

export default function SettingsModal() {
  const playlist = usePlaylist()
  const [settings, setSettings] = React.useState<PlaylistSettings>()
  const [plst, setPlst] = React.useState<ClientPlaylist>()

  const [countToDelete, setCountToDelete] = React.useState(3)
  const [deleteTimeout, setDeleteTimeout] = React.useState(false)

  const { requestPlSettings, requestPlaylistPatch } = useMusicStore()

  React.useEffect(() => {
    setSettings(playlist.settings)
    setPlst(playlist)
  }, [playlist])


  const canPatchSettings = React.useRef(false)
  useDebouncedEffect(
    settings,
    async () => {
      if (!canPatchSettings.current || !settings) return
      canPatchSettings.current = false
      try {
        await requestPlSettings(playlist.id, settings)
        toast.success('Settings saved')
      } catch (err) {
        toast.error('Failed to save settings')
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
          tags: plst.tags,
        }
        await requestPlaylistPatch(plst.id, obj)
        toast.success('Playlist saved')
      } catch (err) {
        toast.error('Failed to save playlist')
      }
    },
    2000,
  )

  const retroTabStyles = `
    bg-level-2 data-[state=active]:bg-level-2 border-2 justify-start

    shadow-[0_3px_0_0_theme(colors.level-3),_0_0px_10px_rgba(0,0,0,0.4),_0_2px_4px_rgba(0,0,0,0.3)]
    sm:shadow-[0_5px_0_0_theme(colors.level-3),_0_0px_15px_rgba(0,0,0,0.55),_0_4px_8px_rgba(0,0,0,0.45)]
    
    hover:shadow-[0_6px_0_0_theme(colors.level-3),0_0px_15px_rgba(255,255,255,0.25),0_4px_8px_rgba(255,255,255,0.15)]
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
    data-[state=active]:shadow-[0_0px_0_0_theme(colors.level-3),0_0px_3px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.05)]
  `

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Btn
          text={<Settings />}
          className="flex w-[50px] bg-level-2"
          onClick={() => setCountToDelete(3)}
        />
      </DialogTrigger>
      <DialogContent className="max-w-[425px] md:max-w-[1200px] bg-level-1 border-level-3 text-text-main h-[700px] overflow-scroll">
        <Tabs className="w-full flex justify-start min-h-full">
          <DialogHeader>
            <DialogTitle className="text-xl">Playlist settings</DialogTitle>
            <DialogDescription>
              Here you can change your playlist settings. Saving automatically
            </DialogDescription>
          </DialogHeader>

          <TabsList
            defaultValue="general"
            className="w-full flex items-center justify-start bg-transparent px-0 mx-0 gap-1"
          >
            <TabsTrigger className={retroTabStyles} value="general">
              Basic
            </TabsTrigger>
            <TabsTrigger className={retroTabStyles} value="validation">
              Validation
            </TabsTrigger>
            <TabsTrigger className={retroTabStyles} value="donation">
              Donation
            </TabsTrigger>
            <TabsTrigger className={retroTabStyles} value="chat-roles">
              Chat Roles
            </TabsTrigger>
            <TabsTrigger className={retroTabStyles} value="block">
              Block
            </TabsTrigger>
            <TabsTrigger className={retroTabStyles} value="delete">
              Delete
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
              <Label className="text-red-500 text-xl">Delete playlist</Label>
              <div className="flex gap-2">
                <Label className="text-red-500 text-xl"> {countToDelete}</Label>
                <Btn
                  text={<div className="py-1 px-2">Delete</div>}
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
                      await deletePlaylist(playlist.id)
                      useMusicStore.getState().deletePlaylist(playlist.id)
                      setCountToDelete('Deleted' as any)
                      toast.success('Playlist ' + playlist.name + ' deleted')
                    } else {
                      setCountToDelete(3)
                    }
                  }}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Delete playlist */}
      </DialogContent>
    </Dialog>
  )
}
