import React from 'react'
import { toast } from 'sonner'
import { LogOut, Settings, ShieldAlert } from 'lucide-react'
import TabBasic from './tabBasic.tsx'
import TabPlatforms from './TabPlatforms.tsx'
import TabBlock from './tabBlock'
import TabModerators from './TabModerators'
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
import { usePlaylistViewLoaded } from '@/features/united-playlist/context/playlist-view-context.tsx'
import { useUserPlaylistRecordsStore } from '@/stores/userPlaylistInfoStore.ts'
import {
  FeatureI18nProvider,
  useFeatureTranslation,
} from '@/lib/i18n/featureTranslation.tsx'
import { leaveModerator } from '@/api/api-moderators'
import { removeModeratorToken } from '@/lib/moderatorTokenStorage'
import { queryClient } from '@/routes/__root'

export default function SettingsModal() {
  return (
    <FeatureI18nProvider ns="playlistSettings">
      <SettingsModalInner />
    </FeatureI18nProvider>
  )
}

export function SettingsModalInner() {
  const { t } = useFeatureTranslation()
  const { playlist, role } = usePlaylistViewLoaded()
  const isOwner = role === 'owner'
  const isModerator = role === 'operator'
  const [countToDelete, setCountToDelete] = React.useState(3)
  const [deleteTimeout, setDeleteTimeout] = React.useState(false)
  const [leaving, setLeaving] = React.useState(false)

  const handleLeaveModeration = async () => {
    if (!playlist?.id) return
    try {
      setLeaving(true)
      await leaveModerator(playlist.id)
      removeModeratorToken(playlist.id)
      useUserPlaylistRecordsStore.getState().removeModerated(playlist.id)
      queryClient.invalidateQueries({ queryKey: ['moderatedPlaylists'] })
      toast.success('Вы покинули состав модераторов плейлиста')
      window.location.reload()
    } catch {
      toast.error('Не удалось покинуть состав модераторов')
    } finally {
      setLeaving(false)
    }
  }

  const retroTabStyles = `
    bg-level-2 data-[state=active]:bg-level-2 border-2 justify-start
    ring-1 ring-accent/40
    shadow-[0_3px_0_0_var(--color-accent),0_4px_5px_-1px_rgba(0,0,0,0.5)] 
    sm:shadow-[0_3px_0_0_var(--color-accent),0_5px_8px_-1px_rgba(0,0,0,0.55)]
    hover:shadow-[0_3px_0_0_var(--color-accent),0_0px_15px_rgba(255,255,255,0.25),0_4px_8px_rgba(255,255,255,0.15)]
    hover:text-shadow-[0_0_4px_rgba(255,255,255,0.8),_0_0_25px_rgba(255,255,255,0.4)]
    hover:[&_svg]:drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]
    disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none
    disabled:hover:shadow-none disabled:hover:text-shadow-none
    disabled:[&_svg]:drop-shadow-none disabled:data-[state=active]:shadow-none
    disabled:data-[state=active]:translate-y-0
    transform translate-y-0 transition-all duration-100
    data-[state=active]:translate-y-[3px]
    sm:data-[state=active]:translate-y-[5px]
    data-[state=active]:shadow-[0_0px_0_0_var(--color-accent),0_0px_3px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.05)]
  `

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Btn
          title={t('playlistSettings.title')}
          className="p-1 bg-level-2 size-8 rounded-sm"
          onClick={() => setCountToDelete(3)}
        >
          <Settings className="size-5" />
        </Btn>
      </DialogTrigger>
      <DialogContent
        className="fixed 
      top-10! bottom-10! left-0! right-0! translate-x-0! translate-y-0! w-screen max-w-full px-1 sm:px-4 h-screen max-h-[90vh] 
      sm:top-[50%]! sm:left-[50%]! sm:-translate-x-1/2! sm:-translate-y-1/2! 
      sm:max-w-6xl sm:h-[80vh] rounded-t-xl sm:rounded-xl bg-level-1 border-accent text-text-main flex flex-col overflow-scroll"
      >
        <Tabs className="min-w-full flex justify-start" defaultValue="general">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {t('playlistSettings.title')}
            </DialogTitle>
            <DialogDescription>
              {t('playlistSettings.description')}
            </DialogDescription>
          </DialogHeader>

          <TabsList
            className={`w-full grid ${
              isOwner
                ? 'grid-cols-2 sm:grid-cols-5'
                : isModerator
                  ? 'grid-cols-2 sm:grid-cols-4'
                  : 'grid-cols-2 sm:grid-cols-3'
            } font-mono justify-start items-center bg-transparent px-0 mx-0 gap-4 mb-3`}
          >
            <TabsTrigger className={retroTabStyles} value="general">
              {t('playlistSettings.tabs.basic')}
            </TabsTrigger>
            <TabsTrigger className={retroTabStyles} value="platforms">
              {t('playlistSettings.tabs.platforms')}
            </TabsTrigger>
            <TabsTrigger className={retroTabStyles} value="block">
              {t('playlistSettings.tabs.block')}
            </TabsTrigger>
            {isOwner && (
              <>
                <TabsTrigger className={retroTabStyles} value="moderators">
                  {t('playlistSettings.tabs.moderators', 'Модерация')}
                </TabsTrigger>
                <TabsTrigger className={retroTabStyles} value="delete">
                  {t('playlistSettings.tabs.delete')}
                </TabsTrigger>
              </>
            )}
            {!isOwner && isModerator && (
              <TabsTrigger className={retroTabStyles} value="leave">
                {t('playlistSettings.tabs.leave', 'Покинуть')}
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent key="generaltab" value="general" className="h-full">
            <TabBasic />
          </TabsContent>

          <TabsContent key="platformstab" value="platforms">
            <TabPlatforms />
          </TabsContent>

          <TabsContent key="blocktab" value="block">
            <TabBlock />
          </TabsContent>

          {isOwner && (
            <>
              <TabsContent key="moderationtab" value="moderators">
                <TabModerators />
              </TabsContent>

              <TabsContent key="deletetab" value="delete">
                <div className="gap-1 flex justify-between mb-4">
                  <Label className="text-red-500 text-xl">
                    {t('playlistSettings.delete.title')}
                  </Label>
                  <div className="flex gap-2">
                    <Label className="text-red-500 text-xl">
                      {countToDelete}
                    </Label>
                    <Btn
                      className="bg-level-2"
                      disabled={deleteTimeout || countToDelete === 0}
                      onClick={() => {
                        if (countToDelete > 1) {
                          setCountToDelete(countToDelete - 1)
                          setDeleteTimeout(true)
                          setTimeout(() => setDeleteTimeout(false), 1000)
                        } else if (countToDelete === 1) {
                          useUserPlaylistRecordsStore
                            .getState()
                            .remove(playlist.id)
                          setCountToDelete(0)
                          toast.success(
                            t('playlistSettings.toast.playlistDeleted', {
                              name: playlist.name,
                            }),
                          )
                        } else {
                          setCountToDelete(3)
                        }
                      }}
                    >
                      <div className="py-1 px-2">
                        {t('playlistSettings.delete.button')}
                      </div>
                    </Btn>
                  </div>
                </div>
              </TabsContent>
            </>
          )}

          {!isOwner && isModerator && (
            <TabsContent key="leavetab" value="leave">
              <div className="bg-level-2/60 border border-red-500/40 rounded-lg p-4 space-y-4">
                <div className="flex items-center gap-2 text-red-400 font-semibold text-base">
                  <ShieldAlert className="size-5" />
                  Покинуть модерацию плейлиста
                </div>
                <p className="text-xs text-text-secondary">
                  Вы являетесь модератором этого плейлиста. Нажав на кнопку
                  ниже, вы откажетесь от модераторских прав и покинете список
                  модераторов.
                </p>
                <Btn
                  disabled={leaving}
                  onClick={handleLeaveModeration}
                  className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 text-xs px-4 py-2 rounded-md font-medium"
                >
                  <LogOut className="size-4 mr-1.5" />
                  {leaving ? 'Выход...' : 'Покинуть состав модераторов'}
                </Btn>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
