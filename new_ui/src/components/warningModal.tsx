import React from 'react'
import Settings from './icons/icon-settings'
import { Input } from './ui/input'
import { Label } from './ui/label'
import Btn from './ui/my-btn'
import { Textarea } from './ui/textarea'
import { Switch } from './ui/switch'
import Warning from './icons/icon-warning'
import type { ClientPlaylist } from '@/types/playlist'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import useMusicStore from '@/stores/musicStore'

export default function WarningModal({
  playlist,
  yt_video_id,
  requester_nickname,
}: {
  playlist: ClientPlaylist
  yt_video_id: string
  requester_nickname: string
}) {
  const [blockUser, setBlockUser] = React.useState(false)
  const [blockTrack, setBlockTrack] = React.useState(false)

  const { requestPlSettings, requestRemoveTrack } = useMusicStore()
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Btn text={<Warning />} className="px-1 bg-level-2" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-level-1 border-level-3 text-text-main  overflow-scroll">
        <DialogHeader>
          <DialogTitle className="text-xl">Report</DialogTitle>
          <DialogDescription>
            Reporting track or user and bloking.
          </DialogDescription>
        </DialogHeader>

        <div>
          <DialogDescription>
            Why are you reporting this track or user?
          </DialogDescription>
          <Textarea placeholder="Reason" />
        </div>

        <div className="flex gap-2">
          <Switch
            defaultChecked={blockUser}
            onCheckedChange={() => setBlockUser(!blockUser)}
          />
          <Label className="">Block user: {requester_nickname}</Label>
        </div>

        <div className="flex gap-2">
          <Switch
            defaultChecked={blockTrack}
            onCheckedChange={() => setBlockTrack(!blockTrack)}
          />
          <Label className="">Block track: {yt_video_id}</Label>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Btn
              text="Report"
              className="w-full"
              onClick={async () => {
                const data = {} as Record<string, Array<string | number>>
                const tracks = []
                if (blockTrack) {
                  data['track_black_list'] = [
                    ...playlist.settings.track_black_list,
                    yt_video_id,
                  ]
                  tracks.push(
                    playlist.track_data.find(
                      (t) => t.yt_video_id === yt_video_id,
                    ),
                  )
                }
                if (blockUser) {
                  data['user_black_list'] = [
                    ...playlist.settings.user_black_list,
                    requester_nickname,
                  ]
                  tracks.push(
                    playlist.track_data.find(
                      (t) => t.requester_nickname === requester_nickname,
                    ),
                  )
                }
                if (Object.keys(data).length > 0) {
                  await requestPlSettings(playlist.id, data)
                  if (tracks.length > 0) {
                    tracks.forEach(async (track) => {
                      if (!track) return
                      await requestRemoveTrack(
                        playlist.id,
                        track.id,
                        'reported',
                      )
                    })
                  }
                }
              }}
            />
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
