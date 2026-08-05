// src/features/playlist-settings/components/playlist-settings/tabBlock.tsx
import React from 'react'
import { Ban, Plus, UserX, Video } from 'lucide-react'
import { toast } from 'sonner'
import BlockList from './block-list'
import { RequestPlatform } from '@/types/playlist'
import { Label } from '@/components/ui/label'
import { DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import Btn from '@/components/ui/my-btn'
import { usePlaylistViewLoaded } from '@/features/united-playlist/context/playlist-view-context'
import { usePlaylistStore } from '@/stores/playlistStore'
import { useFeatureTranslation } from '@/lib/i18n/featureTranslation'

const YT_VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/

const TabBlock = () => {
  const { t } = useFeatureTranslation()
  const { playlist } = usePlaylistViewLoaded()
  const { blockUserRule, patchNow } = usePlaylistStore()

  return (
    <div className="space-y-5">
      {/* Title Header */}
      <div className="flex items-start gap-2.5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-level-1 border border-accent/40 text-accent mt-0.5">
          <Ban className="size-5" />
        </div>
        <div>
          <Label className="text-base font-bold text-text-main">
            {t('playlistSettings.block.title', 'Blacklists & Blocking')}
          </Label>
          <DialogDescription className="text-xs text-text-secondary mt-0.5">
            {t(
              'playlistSettings.block.description',
              'Block specific users or YouTube video IDs from requesting tracks.',
            )}
          </DialogDescription>
        </div>
      </div>

      {/* Block User Section */}
      <div className="space-y-3">
        <div className="p-2.5 sm:p-3 border border-accent/60 rounded-md bg-level-1 space-y-2.5 shadow-xs">
          <div className="text-xs font-semibold text-text-main flex items-center gap-1.5">
            <UserX className="size-4 text-accent" />
            <span>{t('playlistSettings.block.blockUser', 'Block User')}</span>
          </div>

          <form
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full"
            onSubmit={async (e) => {
              e.preventDefault()
              const form = e.currentTarget
              const formData = new FormData(form)

              const platform = formData.get('platform') as string
              const trigger_type = formData.get('trigger_type') as string
              const trigger_value = (
                formData.get('trigger_value') as string
              )?.trim()

              if (!trigger_value || !platform) {
                toast.error(t('playlistSettings.block.validationRequired'))
                return
              }

              const success = await blockUserRule(
                playlist.id,
                trigger_type,
                trigger_value,
                platform,
              )
              if (success) {
                toast.success(t('playlistSettings.block.userBlockedSuccess'))
                form.reset()
              } else {
                toast.error(t('playlistSettings.block.userBlockFailed'))
              }
            }}
          >
            {/* Trigger Type Select */}
            <Select name="trigger_type" defaultValue="USER_NAME">
              <SelectTrigger className="w-full sm:w-32 bg-level-2 border-0 h-8 text-xs sm:text-sm">
                <SelectValue
                  placeholder={t('playlistSettings.block.selectTriggerType')}
                />
              </SelectTrigger>
              <SelectContent className="bg-level-2  text-text-main border-accent/40 text-xs">
                <SelectItem
                  value="USER_NAME"
                  className="focus:bg-level-1 text-text-main focus:text-text-main"
                >
                  {t('playlistSettings.block.triggerUserName', 'Username')}
                </SelectItem>
                <SelectItem
                  value="USER_ID"
                  className="focus:bg-level-1 text-text-main focus:text-text-main"
                >
                  {t('playlistSettings.block.triggerUserId', 'User ID')}
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Platform Select */}
            <Select name="platform">
              <SelectTrigger className="w-full sm:w-28 bg-level-2 border-0 h-8 text-text-main text-xs sm:text-sm">
                <SelectValue
                  placeholder={t('playlistSettings.block.selectPlatform')}
                />
              </SelectTrigger>
              <SelectContent className="bg-level-2 border-accent/40  text-text-main text-xs">
                {Object.entries(RequestPlatform).map(([key, val]) => (
                  <SelectItem
                    key={key}
                    value={val}
                    className="focus:bg-level-1 text-text-main focus:text-text-main"
                  >
                    {key}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Value Input */}
            <Input
              type="text"
              name="trigger_value"
              placeholder={t(
                'playlistSettings.block.enterNicknameOrId',
                'Enter nickname or ID...',
              )}
              className="flex-1 bg-level-2 border-0 h-8 px-2.5 text-xs sm:text-sm focus-visible:ring-1 focus-visible:ring-accent/50"
            />

            {/* Submit Button */}
            <Btn
              type="submit"
              className="h-8 px-3 bg-level-2 text-xs font-semibold text-text-main shrink-0 flex items-center justify-center gap-1 transition-colors"
            >
              <Plus className="size-3.5" />
              <span>{t('playlistSettings.block.addBlock', 'Block')}</span>
            </Btn>
          </form>
        </div>

        {/* Blocked Users List */}
        {playlist.block_list.length > 0 ? (
          <BlockList list={playlist.block_list} type="user" />
        ) : (
          <div className="p-3 border border-dashed border-accent/60 rounded-md bg-level-1/50 text-center">
            <p className="text-xs text-text-secondary">
              {t('playlistSettings.block.emptyUsers', 'No blocked users.')}
            </p>
          </div>
        )}
      </div>

      {/* Block Track Section */}
      <div className="space-y-3 pt-2 border-t border-accent/40">
        <div className="p-2.5 sm:p-3 border border-accent/60 rounded-md bg-level-1 space-y-2.5 shadow-xs">
          <div className="text-xs font-semibold text-text-main flex items-center gap-1.5">
            <Video className="size-4 text-accent" />
            <span>
              {t(
                'playlistSettings.block.blockTrackYoutubeLabel',
                'Block YouTube Video ID',
              )}
            </span>
          </div>

          <form
            className="flex items-center gap-2 w-full"
            onSubmit={async (e) => {
              e.preventDefault()
              const form = e.currentTarget
              const formData = new FormData(form)
              const ytVideoId = (formData.get('yt_video_id') as string)?.trim()

              if (!ytVideoId) {
                toast.error(t('playlistSettings.block.trackYoutubeRequired'))
                return
              }
              if (!YT_VIDEO_ID_REGEX.test(ytVideoId)) {
                toast.error(t('playlistSettings.block.trackYoutubeLength'))
                return
              }
              if (playlist.track_black_list.includes(ytVideoId)) {
                toast.error(t('playlistSettings.block.trackAlreadyBlocked'))
                return
              }

              try {
                await patchNow(playlist.id, {
                  track_black_list: [...playlist.track_black_list, ytVideoId],
                })
                toast.success(t('playlistSettings.block.trackBlockedSuccess'))
                form.reset()
              } catch {
                toast.error(t('playlistSettings.block.trackBlockFailed'))
              }
            }}
          >
            <Input
              type="text"
              name="yt_video_id"
              placeholder={t(
                'playlistSettings.block.blockedVideoId',
                'e.g. dQw4w9WgXcQ',
              )}
              className="flex-1 bg-level-2 border-0 h-8 px-2.5 text-xs sm:text-sm font-mono focus-visible:ring-1 focus-visible:ring-accent/50"
            />
            <Btn
              type="submit"
              className="h-8 px-3 bg-level-2 text-xs font-semibold text-text-main shrink-0 flex items-center gap-1 transition-colors"
            >
              <Plus className="size-3.5" />
              <span>{t('playlistSettings.block.addBlock', 'Block')}</span>
            </Btn>
          </form>
        </div>

        {/* Blocked Tracks List */}
        {playlist.track_black_list.length > 0 ? (
          <BlockList list={playlist.track_black_list} type="track" />
        ) : (
          <div className="p-3 border border-dashed border-accent/60 rounded-md bg-level-1/50 text-center">
            <p className="text-xs text-text-secondary">
              {t(
                'playlistSettings.block.emptyTracks',
                'No blocked YouTube tracks.',
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default TabBlock
