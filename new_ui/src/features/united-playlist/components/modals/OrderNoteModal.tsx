import React from 'react'
import { toast } from 'sonner'
import { FileText, Globe, Lock, Trash2 } from 'lucide-react'
import { usePlaylistView } from '../../context/playlist-view-context'
import type { Track } from '@/types/playlist'
import { Label } from '@/components/ui/label'
import Btn from '@/components/ui/my-btn'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { usePlaylistStore } from '@/stores/playlistStore'
import { upsertOrderNote, deleteOrderNote } from '@/api/api-notes'
import { useFeatureTranslation } from '@/lib/i18n/featureTranslation'

export default function OrderNoteModal({
  track,
  open,
  onOpenChange,
}: {
  track: Track
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const { t } = useFeatureTranslation()
  const { playlistId } = usePlaylistView()
  const { updateTrackNote } = usePlaylistStore()

  const [noteText, setNoteText] = React.useState(track.note || '')
  const [isPublic, setIsPublic] = React.useState(track.is_note_public !== false)
  const [submitting, setSubmitting] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setNoteText(track.note || '')
      setIsPublic(track.is_note_public !== false)
    }
  }, [open, track.note, track.is_note_public])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!playlistId) return

    const trimmed = noteText.trim()
    if (!trimmed) {
      toast.error(t('playlist.track.note.emptyError', 'Note cannot be empty'))
      return
    }

    if (trimmed.length > 500) {
      toast.error(t('playlist.track.note.tooLongError', 'Note cannot exceed 500 characters'))
      return
    }

    setSubmitting(true)
    try {
      await upsertOrderNote(playlistId, track.id, {
        note: trimmed,
        is_public: isPublic,
      })
      updateTrackNote(playlistId, track.id, trimmed, isPublic)
      toast.success(t('playlist.track.note.savedToast', 'Note saved successfully'))
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || t('playlist.track.note.saveError', 'Failed to save note'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!playlistId) return

    setDeleting(true)
    try {
      await deleteOrderNote(playlistId, track.id)
      updateTrackNote(playlistId, track.id, null, true)
      toast.success(t('playlist.track.note.deletedToast', 'Note deleted'))
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || t('playlist.track.note.deleteError', 'Failed to delete note'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-level-2 border-accent/40 text-text-main">
        <form onSubmit={handleSave}>
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-2 text-accent">
              <FileText className="size-5" />
              <DialogTitle className="text-lg font-bold">
                {track.note
                  ? t('playlist.track.note.editTitle', 'Edit Order Note')
                  : t('playlist.track.note.addTitle', 'Add Order Note')}
              </DialogTitle>
            </div>
            <DialogDescription className="text-text-placeholder text-xs truncate">
              {track.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Note text field */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <Label htmlFor="order-note-text" className="font-semibold text-text-main">
                  {t('playlist.track.note.textLabel', 'Note Text')}
                </Label>
                <span
                  className={`font-mono text-[11px] ${
                    noteText.length > 500 ? 'text-destructive font-bold' : 'text-text-placeholder'
                  }`}
                >
                  {noteText.length} / 500
                </span>
              </div>
              <Textarea
                id="order-note-text"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder={t(
                  'playlist.track.note.placeholder',
                  'Enter a note for this track (up to 500 characters)...',
                )}
                rows={4}
                maxLength={500}
                className="resize-none bg-level-1/60 border-accent/30 text-text-main text-sm focus-visible:ring-accent"
              />
            </div>

            {/* Visibility Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-level-1/40 border border-accent/20">
              <div className="space-y-0.5 pr-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-text-main">
                  {isPublic ? (
                    <>
                      <Globe className="size-3.5 text-green-400" />
                      <span>{t('playlist.track.note.publicLabel', 'Public Note')}</span>
                    </>
                  ) : (
                    <>
                      <Lock className="size-3.5 text-amber-400" />
                      <span>{t('playlist.track.note.privateLabel', 'Private Note')}</span>
                    </>
                  )}
                </div>
                <p className="text-[11px] text-text-placeholder">
                  {isPublic
                    ? t(
                        'playlist.track.note.publicDescription',
                        'Visible to all viewers in the playlist queue',
                      )
                    : t(
                        'playlist.track.note.privateDescription',
                        'Only visible to you (playlist owner)',
                      )}
                </p>
              </div>
              <Switch
                checked={isPublic}
                onCheckedChange={setIsPublic}
                aria-label={t('playlist.track.note.toggleVisibility', 'Toggle note visibility')}
              />
            </div>
          </div>

          <DialogFooter className="flex flex-row justify-between items-center gap-2 pt-2 border-t border-accent/15">
            {track.note ? (
              <Btn
                type="button"
                onClick={handleDelete}
                disabled={deleting || submitting}
                className="bg-destructive/20 text-destructive border border-destructive/40 text-xs px-3 py-1.5"
              >
                <Trash2 className="size-3.5 mr-1" />
                {deleting
                  ? t('playlist.track.note.deleting', 'Deleting...')
                  : t('playlist.track.note.delete', 'Delete')}
              </Btn>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <Btn
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={submitting || deleting}
                className="bg-level-1 text-text-placeholder text-xs px-3 py-1.5"
              >
                {t('common.cancel', 'Cancel')}
              </Btn>
              <Btn
                type="submit"
                disabled={submitting || deleting || !noteText.trim()}
                className="bg-accent text-white font-semibold text-xs px-4 py-1.5"
              >
                {submitting
                  ? t('playlist.track.note.saving', 'Saving...')
                  : t('playlist.track.note.save', 'Save')}
              </Btn>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
