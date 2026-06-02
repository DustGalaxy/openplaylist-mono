import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import Btn from '@/components/ui/my-btn'
import Add from '@/components/icons/icon-add'
import { useMusicStore } from '@/stores/musicStore'

export default function AddBar({ playlistId }: { playlistId: string }) {
  const { t } = useTranslation()
  const [visibility, setVisibility] = useState(false)
  const [youtubeurl, setYoutubeurl] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const { requestAddTrack } = useMusicStore()

  const handleAddTrack = async () => {
    if (!youtubeurl.trim()) {
      return
    }

    setIsLoading(true)
    const loadingToast = toast.loading(t('common.toast.loading'))

    try {
      const result = await requestAddTrack(playlistId, youtubeurl)

      toast.dismiss(loadingToast)

      if (result?.success || result === undefined) {
        toast.success(t('playlist.toast.requestAdded'))
        setYoutubeurl('')
        setVisibility(false)
      } else {
        toast.error(result?.message || t('playlist.toast.requestAddedFailed'))
      }
    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error(t('playlist.toast.requestAddedFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className=" flex gap-2 items-center">
      <Btn
        text={<Add />}
        className="px-1 bg-level-2"
        disabled={isLoading}
        onClick={() => {
          if (youtubeurl.trim()) {
            handleAddTrack()
          } else {
            setVisibility(!visibility)
          }
        }}
      />
      <Input
        type="text"
        value={youtubeurl}
        onChange={(e) => setYoutubeurl(e.target.value)}
        onKeyPress={(e) => {
          if (e.key === 'Enter' && youtubeurl.trim() && !isLoading) {
            handleAddTrack()
          }
        }}
        placeholder={t('playlist.addbar.placeholder')}
        disabled={isLoading}
        className={`w-full ${visibility ? 'w-full opacity-100' : 'opacity-0 w-0'} border-[2px] border-level-3 rounded-(--rounded-std) bg-level-2 text-text-main 
        transition-all duration-500 ease-in-out disabled:opacity-50`}
      />
    </div>
  )
}
