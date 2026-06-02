import React from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
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
          <DialogTitle className="text-xl">
            {t('playlist.create.title')}
          </DialogTitle>
          <DialogDescription>{t('playlist.create.description')}</DialogDescription>
        </DialogHeader>
        <Label className="text-lg">{t('playlist.create.nameLabel')}</Label>
        <DialogDescription>{t('playlist.create.nameHint')}</DialogDescription>
        <Input
          type="text"
          placeholder={t('playlist.create.namePlaceholder')}
          className="border-level-3 border-1 w-full mb-4"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Label className="text-lg">{t('playlist.create.descriptionLabel')}</Label>

        <Input
          type="text"
          placeholder={t('playlist.create.descriptionPlaceholder')}
          className="border-level-3 border-1 w-full mb-4"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <DialogFooter>
          <DialogClose asChild>
            <Btn
              text={t('playlist.create.submit')}
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
