import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Plus, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import Btn from '@/components/ui/my-btn'
import { useMusicStore } from '@/stores/musicStore'

interface AddBarProps {
  playlistId: string
  ownerId: string
}

export default function AddBar({ playlistId, ownerId }: AddBarProps) {
  const { t } = useTranslation()
  const [isVisible, setIsVisible] = useState(false)
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const { requestAddTrack } = useMusicStore()

  const handleAddTrack = async () => {
    if (!youtubeUrl.trim()) return

    setIsLoading(true)
    const toastId = toast.loading(t('common.toast.loading'))

    try {
      const result = await requestAddTrack(playlistId, youtubeUrl, ownerId)

      toast.dismiss(toastId)

      if (result?.success || result === undefined) {
        toast.success(t('playlist.toast.requestAdded'))
        setYoutubeUrl('')
        setIsVisible(false)
      } else {
        toast.error(result?.message || t('playlist.toast.requestAddedFailed'))
      }
    } catch (error) {
      toast.dismiss(toastId)
      toast.error(t('playlist.toast.requestAddedFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleButtonClick = () => {
    if (youtubeUrl.trim()) {
      handleAddTrack()
    } else {
      setIsVisible(!isVisible)
    }
  }

  return (
    <div className="flex gap-2 items-center w-full max-w-md">
      <Btn
        className="px-2.5 h-9 bg-level-2 border border-level-3/20 hover:bg-level-3/10 shadow-sm shrink-0 flex items-center justify-center rounded-(--rounded-std)"
        disabled={isLoading}
        onClick={handleButtonClick}
        title={
          youtubeUrl.trim()
            ? t('playlist.addbar.submit')
            : t('playlist.addbar.toggle')
        }
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-text-main" />
        ) : (
          <Plus
            className={`w-4 h-4 text-text-main transition-transform duration-300 ${isVisible && !youtubeUrl ? 'rotate-45' : ''}`}
          />
        )}
      </Btn>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out w-full ${
          isVisible
            ? 'max-w-full opacity-100'
            : 'max-w-0 opacity-0 pointer-events-none'
        }`}
      >
        <Input
          type="text"
          value={youtubeUrl}
          onChange={(e) => setYoutubeUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && youtubeUrl.trim() && !isLoading) {
              handleAddTrack()
            }
          }}
          placeholder={t('playlist.addbar.placeholder')}
          disabled={isLoading}
          className="w-full h-9 border border-level-3/40 rounded-(--rounded-std) bg-level-2 text-text-main placeholder:text-text-placeholder focus-visible:ring-1 focus-visible:ring-level-3 transition-all disabled:opacity-50 px-3 text-sm shadow-inner"
        />
      </div>
    </div>
  )
}
