import React from 'react'
import BlockList from './block-list'
import type { ClientPlaylist } from '@/types/playlist'
import { RequestPlatform } from '@/types/playlist'
import { Label } from '@/components/ui/label'
import { DialogDescription } from '@/components/ui/dialog'
import Add from '@/components/icons/icon-add'
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

const TabBlock = ({ playlist }: { playlist: ClientPlaylist }) => {
  return (
    <div>
      <div>
        <div className="">
          <Label className=" text-xl">Block Lists</Label>
          <DialogDescription>
            <p>An block users or tracks.</p>
          </DialogDescription>
          {/* <Btn
                text={<Add width={25} height={25} />}
                className="ml-auto px-1 mb-1"
              /> */}
        </div>
        <div>
          <Label className=" text-lg">Block user</Label>
          <form
            className="flex items-center gap-2 mt-2 w-full"
            onSubmit={async (e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              const platform = formData.get('platform') as string
              const trigger_type = formData.get('trigger_type') as string
              const trigger_value = formData.get('trigger_value') as string
              if (trigger_value && platform) {
                await blockUser(
                  playlist.id,
                  playlist.settings.id,
                  trigger_type,
                  trigger_value,
                  platform,
                )

                e.currentTarget.reset()
              } else {
                // Handle validation error (e.g., show a message to the user)
                toast.error('Nickname/ID and platform are required.')
              }
            }}
          >
            <Btn
              text={<Add className="text-text-main" width={20} height={20} />}
              className="cursor-pointer px-2 bg-level-2"
              type="submit"
            ></Btn>
            <Select name="trigger_type">
              <SelectTrigger className="w-fit bg-level-2 ">
                <SelectValue placeholder="Select trigger type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USER_NAME">User Name</SelectItem>
                <SelectItem value="USER_ID">User ID</SelectItem>
              </SelectContent>
            </Select>

            <input
              type="text"
              name="trigger_value"
              placeholder="Enter user nickname or ID"
              className="w-full rounded-md border border-input bg-level-2 px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
            <Select name="platform">
              <SelectTrigger className="w-full bg-level-2">
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(RequestPlatform).map(([key, val], i) => (
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
              <p>No users block.</p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 mt-2 w-full">
          {playlist.settings.track_black_list.length > 0 ? (
            <BlockList
              list={playlist.settings.track_black_list}
              type="track"
              playlist={playlist}
            />
          ) : (
            <div className="flex text-text-secondary text-sm justify-center w-full">
              <p>No tracks block.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TabBlock
