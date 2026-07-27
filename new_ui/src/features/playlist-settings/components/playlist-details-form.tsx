import React from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { DialogDescription } from '@/components/ui/dialog'
import { usePlaylistStore } from '@/stores/playlistStore'
import { usePlaylistViewLoaded } from '@/features/united-playlist/context/playlist-view-context'
import { useFeatureTranslation } from '@/lib/i18n/featureTranslation'

const MAX_NAME_LENGTH = 100
const MAX_DESCRIPTION_LENGTH = 500

export default function PlaylistDetailsForm() {
  const { t } = useFeatureTranslation()
  const { playlist } = usePlaylistViewLoaded()
  const { patchNow, patchDebounced } = usePlaylistStore()
  const [name, setName] = React.useState(playlist.name)
  const [description, setDescription] = React.useState(
    playlist.description ?? '',
  )

  return (
    <div className="grid gap-3 mb-6">
      <div>
        <Label className="text-lg">{t('playlistSettings.details.name')}</Label>
        <DialogDescription>
          {t('playlistSettings.details.nameHelp')}
        </DialogDescription>
        <Input
          type="text"
          name="name"
          value={name}
          onChange={(e) => {
            const value = e.target.value
            if (value.length > MAX_NAME_LENGTH) {
              toast.error(t('playlistSettings.details.nameTooLong'))
              return
            }
            if (!value.trim()) {
              toast.error(t('playlistSettings.details.nameRequired'))
              return
            }
            setName(value)
            patchDebounced(playlist, { name: value })
          }}
          placeholder={t('playlistSettings.details.namePlaceholder')}
          maxLength={MAX_NAME_LENGTH}
          className="mt-2 border-level-3 border-1 w-full bg-level-2"
        />
      </div>

      <div>
        <Label className="text-lg">
          {t('playlistSettings.details.description')}
        </Label>
        <DialogDescription>
          {t('playlistSettings.details.descriptionHelp')}
        </DialogDescription>
        <Textarea
          name="description"
          value={description ?? ''}
          onChange={(e) => {
            const value = e.target.value
            if (value.length > MAX_DESCRIPTION_LENGTH) {
              toast.error(t('playlistSettings.details.descriptionTooLong'))
              return
            }
            setDescription(value)
            patchDebounced(playlist, { description: value })
          }}
          placeholder={t('playlistSettings.details.descriptionPlaceholder')}
          maxLength={MAX_DESCRIPTION_LENGTH}
          rows={3}
          className="mt-2 border-level-3 border w-full bg-level-2 resize-none"
        />
      </div>
    </div>
  )
}
