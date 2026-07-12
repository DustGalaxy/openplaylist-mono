import { useTranslation } from 'react-i18next'
import BlockList from './block-list'
import type { ClientPlaylist } from '@/types/playlist'
import { RequestPlatform } from '@/types/playlist'
import { Label } from '@/components/ui/label'
import { DialogDescription } from '@/components/ui/dialog'
import { Plus } from 'lucide-react'
import { blockUser } from '@/api/api-playlist'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import Btn from '@/components/ui/my-btn'
import { toast } from 'sonner'
import { useMusicStore } from '@/stores/musicStore'

const YT_VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/

const TabBlock = ({ playlist }: { playlist: ClientPlaylist }) => {
  const { t } = useTranslation()
  const { requestPlSettings, syncPlSettings } = useMusicStore()
  return (
    <div>
      <div>
        <div className="">
          <Label className=" text-xl">
            {t('playlistSettings.block.title')}
          </Label>
          <DialogDescription>
            <p>{t('playlistSettings.block.description')}</p>
          </DialogDescription>
        </div>
        <div>
          <Label className=" text-lg">
            {t('playlistSettings.block.blockUser')}
          </Label>
          <form
            className="flex items-center gap-2 mt-2 w-full"
            onSubmit={async (e) => {
              e.preventDefault()
              const form = e.currentTarget
              const formData = new FormData(form)

              const platform = formData.get('platform') as string
              const trigger_type = formData.get('trigger_type') as string
              const trigger_value = formData.get('trigger_value') as string
              if (trigger_value && platform) {
                const res = await blockUser(
                  playlist.id,
                  playlist.settings.id,
                  trigger_type,
                  trigger_value,
                  platform,
                )

                if (res) {
                  toast.success(t('playlistSettings.block.userBlockedSuccess'))
                  const settings = playlist.settings
                  settings.block_list.push(res)
                  syncPlSettings(playlist.id, settings)
                } else {
                  toast.error(t('playlistSettings.block.userBlockFailed'))
                }
                form.reset()
              } else {
                toast.error(t('playlistSettings.block.validationRequired'))
              }
            }}
          >
            <Btn className="cursor-pointer px-2 bg-level-2" type="submit">
              <Plus className="text-text-main size-5" />
            </Btn>
            <Select name="trigger_type">
              <SelectTrigger className="w-fit bg-level-2 ">
                <SelectValue
                  placeholder={t('playlistSettings.block.selectTriggerType')}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USER_NAME">
                  {t('playlistSettings.block.triggerUserName')}
                </SelectItem>
                <SelectItem value="USER_ID">
                  {t('playlistSettings.block.triggerUserId')}
                </SelectItem>
              </SelectContent>
            </Select>

            <input
              type="text"
              name="trigger_value"
              placeholder={t('playlistSettings.block.enterNicknameOrId')}
              className="w-full rounded-md border border-input bg-level-2 px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
            <Select name="platform">
              <SelectTrigger className="w-full bg-level-2">
                <SelectValue
                  placeholder={t('playlistSettings.block.selectPlatform')}
                />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(RequestPlatform).map(([key, val]) => (
                  <SelectItem key={key} value={val}>
                    {key}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </form>
        </div>
        <div className="flex flex-col gap-2 mt-2 w-full">
          {playlist.settings.block_list.length > 0 ? (
            <BlockList
              list={playlist.settings.block_list}
              type="user"
              playlist={playlist}
            />
          ) : (
            <div className="flex text-text-secondary text-sm justify-center w-full">
              <p>{t('playlistSettings.block.emptyUsers')}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 mt-2 w-full">
          <Label className=" text-lg">
            {t('playlistSettings.block.blockTrackYoutubeLabel')}
          </Label>
          <form
            className="flex items-center gap-2 mt-2 w-full"
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

              if (playlist.settings.track_black_list.includes(ytVideoId)) {
                toast.error(t('playlistSettings.block.trackAlreadyBlocked'))
                return
              }

              await requestPlSettings(playlist.id, {
                track_black_list: [
                  ...playlist.settings.track_black_list,
                  ytVideoId,
                ],
              })
              toast.success(t('playlistSettings.block.trackBlockedSuccess'))
              form.reset()
            }}
          >
            <Btn className="cursor-pointer px-2 bg-level-2" type="submit">
              <Plus className="text-text-main size-5" />
            </Btn>

            <input
              type="text"
              name="yt_video_id"
              placeholder={t('playlistSettings.block.blockedVideoId')}
              className="w-full rounded-md border border-input bg-level-2 px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </form>

          {playlist.settings.track_black_list.length > 0 ? (
            <BlockList
              list={playlist.settings.track_black_list}
              type="track"
              playlist={playlist}
            />
          ) : (
            <div className="flex text-text-secondary text-sm justify-center w-full">
              <p>{t('playlistSettings.block.emptyTracks')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TabBlock
