import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Copy, ExternalLink, Heart } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

const DONATE_URL = 'https://destream.net/live/dustgalaxy/donate'

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
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(DONATE_URL)
      setCopied(true)
      toast.success(t('supportModal.linkCopied', 'Donation link copied!'))
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error(t('common.toast.error', 'Something went wrong'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-level-2 text-text-main border-2 border-level-3 sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader className="items-center text-center">
          <div className="p-3 rounded-full bg-(--color-accent-2)/10 mb-1">
            <Heart className="text-(--color-accent-2)" size={28} />
          </div>
          <DialogTitle className="text-xl font-bold">
            {t('supportModal.title', 'Support the project')}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-text-secondary text-center">
          {t(
            'supportModal.text',
            'Right now the best support is to tell your friends, try the app out, and leave feedback.',
          )}
        </p>

        {/* Donation Section */}
        <div className="flex flex-col items-center gap-3 p-4 rounded-xl bg-level-1 border border-level-3/50 text-center hidden">
          <p className="text-xs font-medium text-text-main/90">
            {t(
              'supportModal.thankYou',
              'The project lives and grows only by your support, thanks!',
            )}
          </p>

          {/* QR Code Container */}
          <div className="p-3 bg-white rounded-xl shadow-md flex items-center justify-center">
            <QRCodeSVG value={DONATE_URL} size={160} level="M" marginSize={0} />
          </div>

          <p className="text-[11px] text-text-secondary">
            {t('supportModal.qrHint', 'Scan QR code to donate')}
          </p>

          {/* Action Buttons for Link */}
          <div className="flex flex-col sm:flex-row gap-2 w-full pt-1">
            <Button
              asChild
              className="flex-1 gap-2 bg-(--color-accent-2) hover:bg-(--color-accent-2)/90 text-white"
            >
              <a href={DONATE_URL} target="_blank" rel="noopener noreferrer">
                {t('supportModal.donateCta', 'Donate via DeStream')}
                <ExternalLink size={16} />
              </a>
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={handleCopy}
              title={t('supportModal.copyLink', 'Copy link')}
              className="shrink-0 border-level-3 hover:bg-level-2 text-text-main"
            >
              {copied ? (
                <Check size={16} className="text-green-500" />
              ) : (
                <Copy size={16} />
              )}
            </Button>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={() => {
            onOpenChange(false)
            onFeedbackClick()
          }}
          className="w-full border-level-3 hover:bg-level-1 text-text-main"
        >
          {t('supportModal.feedbackCta', 'Leave feedback')}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
