import React from 'react'
import { Label } from '../ui/label'
import { DialogDescription } from '../ui/dialog'
import BlockList from '../block-list'
import type { ClientPlaylist } from '@/types/playlist'

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

        <div className="flex flex-col gap-2 mt-2 w-full">
          {playlist.settings.block_list.length > 0 ? (
            <BlockList
              list={playlist.settings.block_list}
              type="user"
              playlist={playlist}
            />
          ) : (
            <div className="flex text-muted-foreground text-sm justify-center w-full">
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
            <div className="flex text-muted-foreground text-sm justify-center w-full">
              <p>No tracks block.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TabBlock
