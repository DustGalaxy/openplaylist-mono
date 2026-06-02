import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import Btn from '@/components/ui/my-btn'
import Add from '@/components/icons/icon-add'
import { useMusicStore } from '@/stores/musicStore'

export default function AddBar({ playlistId }: { playlistId: string }) {
  const { t } = useTranslation()
  const [visibility, setVisibility] = useState(false)
  const [youtubeurl, setYoutubeurl] = useState('')

  const { requestAddTrack } = useMusicStore()

  return (
    <div className=" flex gap-2 items-center">
      <Btn
        text={<Add />}
        className="px-1 bg-level-2"
        onClick={async () => {
          if (youtubeurl) {
            await requestAddTrack(playlistId, youtubeurl)
            setYoutubeurl('')
          }
          setVisibility(!visibility)
        }}
      />
      <Input
        type="text"
        value={youtubeurl}
        onChange={(e) => setYoutubeurl(e.target.value)}
        placeholder={t('playlist.addbar.placeholder')}
        className={`w-full ${visibility ? 'w-full opacity-100' : 'opacity-0 w-0'} border-[2px] border-level-3 rounded-(--rounded-std) bg-level-2 text-text-main 
        transition-all duration-500 ease-in-out`}
      />
    </div>
  )
}
