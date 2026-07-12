import React from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

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
import { Plus } from 'lucide-react'
import { Switch } from '@/components/ui/switch'

export default function AddPlaylistModal() {
  const { t } = useTranslation()

  const [name, setName] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [showInWidget, setShowInWinget] = React.useState(false)

  const [isLoading, setIsLoading] = React.useState(false)
  const [open, setOpen] = React.useState(false)

  const { addPlaylist } = useMusicStore()

  const handleCreatePlaylist = async () => {
    if (!name.trim()) {
      toast.error(t('playlistSettings.details.nameRequired'))
      return
    }

    setIsLoading(true)
    const loadingToast = toast.loading(t('playlist.create.submitting'))

    try {
      const newPlst = await createNewPlaylist(name, showInWidget, description)

      if (newPlst) {
        addPlaylist(newPlst)
        toast.dismiss(loadingToast)
        toast.success(
          t('playlist.create.success', {
            defaultValue: t('playlist.toast.created', { name }),
          }),
        )
        setName('')
        setDescription('')
        setOpen(false)
      } else {
        toast.dismiss(loadingToast)
        toast.error(t('playlist.create.failed'))
      }
    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error(t('playlist.create.failed'))
      console.error('Failed to create playlist:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild className="m-1.5">
        <Btn className="flex p-1 bg-level-2 mr-1">
          <Plus size={26} />
        </Btn>
      </DialogTrigger>
      <DialogContent className="sm:max-w-106.25 bg-level-2 border-level-3 text-text-main ">
        <DialogHeader>
          <DialogTitle className="text-xl text-text-main font-bold">
            {t('playlist.create.title')}
          </DialogTitle>
          <DialogDescription>
            {t('playlist.create.description')}
          </DialogDescription>
        </DialogHeader>
        <Label className="text-lg">{t('playlist.create.nameLabel')}</Label>
        <DialogDescription>{t('playlist.create.nameHint')}</DialogDescription>
        <Input
          type="text"
          placeholder={t('playlist.create.namePlaceholder')}
          className="border-level-3 border w-full mb-4"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isLoading}
        />
        <Label className="text-lg">
          {t('playlist.create.descriptionLabel')}
        </Label>

        <Input
          type="text"
          placeholder={t('playlist.create.descriptionPlaceholder')}
          className="border-level-3 border w-full mb-4"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isLoading}
        />
        <div className="flex items-center justify-between">
          <Label className="text-lg">{t('playlist.create.showInWidget')}</Label>
          <Switch
            checked={showInWidget}
            onCheckedChange={(v) => setShowInWinget(v)}
            className="ring-1 ring-level-3"
          />
        </div>

        <DialogDescription>
          {t('playlist.create.showInWidgetHint')}
        </DialogDescription>

        <DialogFooter>
          <DialogClose asChild>
            <Btn
              className="w-full font-mono"
              disabled={isLoading}
              onClick={handleCreatePlaylist}
            >
              {isLoading
                ? t('common.toast.saving')
                : t('playlist.create.submit')}
            </Btn>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
