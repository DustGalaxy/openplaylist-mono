import { useTranslation } from 'react-i18next'
import { Heart } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

type SupportModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onFeedbackClick: () => void
}

export default function SupportModal({
  open,
  onOpenChange,
  onFeedbackClick,
}: SupportModalProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-level-2 text-text-main border-2 border-level-3 sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <Heart className="text-(--color-accent-2)" size={28} />
          <DialogTitle>
            {t('supportModal.title', 'Support the project')}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-text-secondary text-center py-2">
          {t(
            'supportModal.text',
            'Right now the best support is to tell your friends, try the app out, and leave feedback.',
          )}
        </p>

        <Button
          onClick={() => {
            onOpenChange(false)
            onFeedbackClick()
          }}
          className="w-full"
        >
          {t('supportModal.feedbackCta', 'Leave feedback')}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
