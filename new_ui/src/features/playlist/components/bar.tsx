import { useState, useEffect } from 'react'
import Btn from '@/components/ui/my-btn'
import Search from '@/components/icons/icon-search'
import { Input } from '@/components/ui/input'
import Add from '@/components/icons/icon-add'
import type { ClientPlaylist } from '@/types/playlist'
import useMusicStore from '@/stores/musicStore'
import { extractYouTubeVideoId } from '@/lib/utils'

export function ExpandingInputButtons({
  playlist,
}: {
  playlist: ClientPlaylist
}) {
  const [activeInput, setActiveInput] = useState(null)
  const [visibleInput, setVisibleInput] = useState(null)
  const [animationClass, setAnimationClass] = useState('')

  const [youtubeurl, setYoutubeurl] = useState('')

  const { requestAddTrack } = useMusicStore()

  // Используем useEffect для управления анимацией
  useEffect(() => {
    if (activeInput) {
      setVisibleInput(activeInput)
      setAnimationClass('animate-expand')
    } else {
      // Когда инпут должен исчезнуть, запускаем анимацию collapse
      if (visibleInput) {
        setAnimationClass('animate-collapse')
        const timer = setTimeout(() => {
          setVisibleInput(null)
          setAnimationClass('')
        }, 300) // 300ms = длительность анимации
        return () => clearTimeout(timer)
      }
    }
  }, [activeInput, visibleInput])

  const handleToggle = (inputName) => {
    setActiveInput(activeInput === inputName ? null : inputName)
  }

  return (
    <div className="flex items-center gap-2 w-full py-2 rounded-lg">
      {/* Инпут и кнопка для первого элемента */}
      <div className="flex items-center gap-2">
        <Btn
          text={<Add />}
          onClick={async () => {
            handleToggle('input1')
            if (youtubeurl) {
              await requestAddTrack(playlist.id, youtubeurl)
              setYoutubeurl('')
            }
          }}
          className=" text-text-main px-1 bg-level-2 transition-all duration-300"
        />
        {visibleInput === 'input1' && (
          <Input
            type="text"
            value={youtubeurl}
            onChange={(e) => setYoutubeurl(e.target.value)}
            placeholder="Paste url here"
            className={`p-2 border-[2px] border-level-3 rounded-(--rounded-std) bg-level-2 text-text-main overflow-hidden ${animationClass}`}
          />
        )}
      </div>

      {/* Инпут и кнопка для второго элемента */}
      <div className="flex items-center gap-2">
        <Btn
          text={<Search />}
          onClick={() => handleToggle('input2')}
          className=" text-text-main px-1  bg-level-2 transition-all duration-300"
        />
        {visibleInput === 'input2' && (
          <Input
            type="text"
            placeholder="Search"
            className={`p-2 border-[2px] border-level-3 rounded-(--rounded-std) bg-level-2 text-text-main overflow-hidden ${animationClass}`}
          />
        )}
      </div>
    </div>
  )
}
