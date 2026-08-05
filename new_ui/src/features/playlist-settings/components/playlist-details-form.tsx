import React from 'react'
import { FileText, PencilLine } from 'lucide-react'
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
  const { patchDebounced } = usePlaylistStore()
  const [name, setName] = React.useState(playlist.name)
  const [description, setDescription] = React.useState(
    playlist.description ?? '',
  )

  return (
    <div className="p-3 border border-accent/60 rounded-md bg-level-1 space-y-3.5 shadow-xs">
      <div className="flex items-center gap-2">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-level-2 border border-accent/40 text-accent">
          <PencilLine className="size-4" />
        </div>
        <Label className="text-sm font-bold text-text-main">
          {t('playlistSettings.details.title', 'Playlist Details')}
        </Label>
      </div>

      {/* Name Input */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-text-main">
            {t('playlistSettings.details.name')}
          </Label>
          <span className="text-[10px] text-text-placeholder">
            {name.length}/{MAX_NAME_LENGTH}
          </span>
        </div>
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
            patchDebounced(playlist.id, { name: value })
          }}
          placeholder={t('playlistSettings.details.namePlaceholder')}
          maxLength={MAX_NAME_LENGTH}
          className="bg-level-2 border-0 h-8 px-2.5 text-xs sm:text-sm focus-visible:ring-1 focus-visible:ring-accent/50"
        />
        <DialogDescription className="text-[11px] text-text-secondary mt-0.5">
          {t('playlistSettings.details.nameHelp')}
        </DialogDescription>
      </div>

      {/* Description Textarea */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-text-main">
            {t('playlistSettings.details.description')}
          </Label>
          <span className="text-[10px] text-text-placeholder">
            {description.length}/{MAX_DESCRIPTION_LENGTH}
          </span>
        </div>
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
            patchDebounced(playlist.id, { description: value })
          }}
          placeholder={t('playlistSettings.details.descriptionPlaceholder')}
          maxLength={MAX_DESCRIPTION_LENGTH}
          rows={2}
          className="bg-level-2 border-0 p-2 text-xs sm:text-sm focus-visible:ring-1 focus-visible:ring-accent/50 resize-none min-h-[60px]"
        />
        <DialogDescription className="text-[11px] text-text-secondary mt-0.5">
          {t('playlistSettings.details.descriptionHelp')}
        </DialogDescription>
      </div>
    </div>
  )
}
