import { useState } from 'react'
import { toast } from 'sonner'
import type { Track } from '@/types/playlist'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import Btn from '@/components/ui/my-btn'

import { useFeatureTranslation } from '@/lib/i18n/featureTranslation'

export default function ReportModal({
  track,
  open,
  onOpenChange,
}: {
  track: Track
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const { t } = useFeatureTranslation()

  const REASONS = [
    {
      key: 'inappropriate',
      label: t(
        'playlist.track.report.reasons.inappropriate',
        'Inappropriate content',
      ),
    },
    { key: 'spam', label: t('playlist.track.report.reasons.spam', 'Spam') },
    {
      key: 'wrong_track',
      label: t('playlist.track.report.reasons.wrong_track', 'Wrong track'),
    },
    { key: 'other', label: t('playlist.track.report.reasons.other', 'Other') },
  ] as const

  const [reason, setReason] =
    useState<(typeof REASONS)[number]['key']>('inappropriate')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    setSubmitting(true)
    try {
      // TODO: submitPlaylistReport(playlistId, track.id, { reason, comment })
      console.debug('[report]', track.id, reason, comment)
      toast.success(t('playlist.track.report.success', 'Report sent'))
      onOpenChange(false)
      setComment('')
    } catch {
      toast.error(t('playlist.track.report.error', 'Failed to send report'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm text-text-main bg-level-2 border-accent">
        <DialogTitle>
          {t('playlist.track.report.title', 'Report track')}
        </DialogTitle>

        <div className="flex flex-col gap-3">
          <p className="text-sm text-text-secondary truncate">{track.title}</p>

          <RadioGroup
            value={reason}
            onValueChange={(v) => setReason(v as typeof reason)}
          >
            {REASONS.map((r) => (
              <div key={r.key} className="flex items-center gap-2">
                <RadioGroupItem value={r.key} id={`report-${r.key}`} />
                <Label htmlFor={`report-${r.key}`}>{r.label}</Label>
              </div>
            ))}
          </RadioGroup>

          <Textarea
            placeholder={t(
              'playlist.track.report.commentPlaceholder',
              'Comment (optional)',
            )}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />
        </div>

        <DialogFooter>
          <div className="flex justify-between w-full">
            <Btn onClick={() => onOpenChange(false)} className="px-2">
              {t('playlist.track.report.cancel', 'Cancel')}
            </Btn>
            <Btn onClick={submit} disabled={submitting} className="px-2">
              {t('playlist.track.report.submit', 'Submit')}
            </Btn>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
