import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type FeedbackType = 'feedback' | 'bug'

type FeedbackPayload = {
  type: FeedbackType
  name?: string
  contact?: string
  rating?: number
  text: string
}

// ponytail: no backend contract yet, stub submit
async function submitFeedback(payload: FeedbackPayload) {
  console.debug('[feedback] submit', payload)
  // TODO: POST /feedback when backend endpoint exists
  await new Promise((r) => setTimeout(r, 300))
}

const RATING_SCALE = Array.from({ length: 11 }, (_, i) => i) // 0..10

type FeedbackModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: FeedbackType
}

export default function FeedbackModal({
  open,
  onOpenChange,
  type,
}: FeedbackModalProps) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [rating, setRating] = useState(0)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const reset = () => {
    setName('')
    setContact('')
    setRating(0)
    setText('')
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const handleSubmit = async () => {
    if (!text.trim()) return
    setSubmitting(true)
    try {
      await submitFeedback({
        type,
        name: name.trim() || undefined,
        contact: contact.trim() || undefined,
        rating: rating > 0 ? rating : undefined,
        text: text.trim(),
      })
      toast.success(
        t('feedbackModal.sent', 'Thanks! Your message has been sent.'),
      )
      handleOpenChange(false)
    } catch {
      toast.error(
        t('feedbackModal.sendError', 'Failed to send, please try again later.'),
      )
    } finally {
      setSubmitting(false)
    }
  }

  const title =
    type === 'bug'
      ? t('feedbackModal.bugTitle', 'Report a bug')
      : t('feedbackModal.feedbackTitle', 'Send feedback')
  const placeholder =
    type === 'bug'
      ? t(
          'feedbackModal.bugPlaceholder',
          'What went wrong? Steps to reproduce help a lot.',
        )
      : t(
          'feedbackModal.feedbackPlaceholder',
          'What do you think? Ideas, complaints, praise — all welcome.',
        )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-level-2 text-text-main border-2 border-level-3 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fb-name" className="text-text-secondary text-xs">
              {t('feedbackModal.name', 'Name')}
            </Label>
            <Input
              id="fb-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t(
                'feedbackModal.namePlaceholder',
                'Your name (optional)',
              )}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fb-contact" className="text-text-secondary text-xs">
              {t('feedbackModal.contact', 'Contact')}
            </Label>
            <Input
              id="fb-contact"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder={t(
                'feedbackModal.contactPlaceholder',
                'Email or Telegram (optional)',
              )}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-text-secondary text-xs">
              {t('feedbackModal.rating', 'Rating')} — {rating}/10
            </Label>
            <div className="flex flex-wrap gap-1">
              {RATING_SCALE.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n === rating ? 0 : n)}
                  className={cn(
                    'h-7 w-7 rounded-full text-xs transition-colors border',
                    n <= rating && rating > 0
                      ? 'bg-level-3 border-level-3 text-white'
                      : 'bg-level-1 border-level-3/40 text-text-secondary hover:border-level-3',
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fb-text" className="text-text-secondary text-xs">
              {t('feedbackModal.text', 'Message')} *
            </Label>
            <Textarea
              id="fb-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={placeholder}
              rows={4}
              required
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={!text.trim() || submitting}
            className="w-full sm:w-auto"
          >
            {t('feedbackModal.submit', 'Send')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
