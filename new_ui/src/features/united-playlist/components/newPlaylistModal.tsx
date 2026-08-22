import React from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import Btn from '@/components/ui/my-btn'
import { TagInput } from '@/components/ui/tag-input'

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
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { useUserPlaylistRecordsStore } from '@/stores/userPlaylistInfoStore'
import { useFeatureTranslation } from '@/lib/i18n/featureTranslation'

export default function AddPlaylistModal({
  className,
}: {
  className?: string
}) {
  const { t } = useTranslation('playlist')
  const { t: ts } = useTranslation('playlistSetings')

  const [name, setName] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [tags, setTags] = React.useState<string[]>([])

  const [isLoading, setIsLoading] = React.useState(false)
  const [open, setOpen] = React.useState(false)

  const { add } = useUserPlaylistRecordsStore()

  const handleCreatePlaylist = async () => {
    if (!name.trim()) {
      toast.error(ts('playlistSettings.details.nameRequired', 'Playlist name is required'))
      return
    }

    setIsLoading(true)
    const loadingToast = toast.loading(t('playlist.create.submitting'))

    try {
      const newPlst = await createNewPlaylist(name, description, tags)

      if (newPlst) {
        add(newPlst)
        toast.dismiss(loadingToast)
        toast.success(
          t('playlist.create.success', {
            defaultValue: t('playlist.toast.created', { name }),
          }),
        )
        setName('')
        setDescription('')
        setTags([])
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
      <DialogTrigger asChild>
        <Btn className={cn('flex p-1 bg-level-2  rounded-md ', className)}>
          <Plus className="size-5" />
        </Btn>
      </DialogTrigger>
      <DialogContent className="sm:max-w-106.25 bg-level-2 border-accent text-text-main ">
        <DialogHeader>
          <DialogTitle className="text-xl text-text-main font-bold">
            {t('playlist.create.title')}
          </DialogTitle>
          <DialogDescription>
            {t('playlist.create.description')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-sm font-semibold">{t('playlist.create.nameLabel')}</Label>
            <DialogDescription className="text-xs text-text-secondary mb-1.5">{t('playlist.create.nameHint')}</DialogDescription>
            <Input
              type="text"
              placeholder={t('playlist.create.namePlaceholder')}
              className="border-accent/50 border w-full bg-level-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div>
            <Label className="text-sm font-semibold">
              {t('playlist.create.descriptionLabel')}
            </Label>
            <Input
              type="text"
              placeholder={t('playlist.create.descriptionPlaceholder')}
              className="border-accent/50 border w-full bg-level-1 mt-1.5"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div>
            <TagInput
              tags={tags}
              onChange={setTags}
              label={t('playlistSettings.tags.label', 'Tags')}
              placeholder={t('playlistSettings.tags.placeholder', 'Add tag... (e.g. lofi, gaming)')}
              hint={t('playlistSettings.tags.hint', 'Add tags to make your playlist easier to find')}
              disabled={isLoading}
            />
          </div>
        </div>

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
