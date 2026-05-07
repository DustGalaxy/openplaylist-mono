import React, { use } from 'react'
import Add from '@/components/icons/icon-add'
import { Input } from '@/components/ui/input'
import Btn from '@/components/ui/my-btn'

import { Label } from '@/components/ui/label'
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
import { createNewPlaylist } from '@/api/api-playlist'
import useMusicStore from '@/stores/musicStore'

export default function AddPlaylistModal() {
  const [name, setName] = React.useState('')
  const [description, setDescription] = React.useState('')

  const { addPlaylist } = useMusicStore()

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Btn
          text={<Add width={33} height={33} />}
          className="flex p-1 bg-level-2 mr-1"
        />
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-level-1 border-level-3 text-text-main ">
        <DialogHeader>
          <DialogTitle className="text-xl">New playlist</DialogTitle>
          <DialogDescription>Form to create new playlist</DialogDescription>
        </DialogHeader>
        <Label className="text-lg">Playlist name</Label>
        <DialogDescription>Playlist name must be unique</DialogDescription>
        <Input
          type="text"
          placeholder="Type name here..."
          className="border-level-3 border-1 w-full mb-4"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Label className="text-lg">Playlist description</Label>

        <Input
          type="text"
          placeholder="Type description here..."
          className="border-level-3 border-1 w-full mb-4"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <DialogFooter>
          <DialogClose asChild>
            <Btn
              text="Create"
              className="w-full"
              onClick={async () => {
                const newPlst = await createNewPlaylist(name, description)
                addPlaylist(newPlst)
              }}
            />
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
