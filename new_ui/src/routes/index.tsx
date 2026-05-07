import { createFileRoute, useNavigate } from '@tanstack/react-router'

import DateChip from '@/components/ui/date-chip'
import Btn from '@/components/ui/my-btn'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuthStore } from '@/stores/authStore'
import { useTwitchLoginUrl } from '@/hooks/useAuthUrl'
import SearchPlaylist from '@/features/public-playlist/components/search-playlist'

export const Route = createFileRoute('/')({
  component: App,
})

{
  /* <DateChip />
        <Btn
          text="123"
          className="px-4 w-[60px]"
          onClick={() => console.log('123')}
        />
        <Btn
          text={<Play />}
          className="pr-1 pl-2"
          onClick={() => console.log('123')}
        />
        <PriorityChip number={5} />
        <DurationChip time={201} />
        <div className="flex flex-col gap-9">
          <OrderCard btns_type="playlist" />
          <OrderCard btns_type="non-playlist" />
        </div>

        <div className="mt-10 ">
          <OrderMiniCard btns_type="non-playlist" />
          <OrderMiniCard btns_type="playlist" />
        </div> */
}

function App() {
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  const handleTwitchLogin = useTwitchLoginUrl()
  return (
    <div className="text-center text-text-main bg-level-1 w-full ">
      <div className="h-[90vh] flex flex-col items-center">
        <div
          className="
          grid grid-cols-1 [@media_(min-width:1150px)]:grid-cols-[10fr_7fr] gap-4 
           items-center px-8 h-full
        "
        >
          <h1
            className="text-7xl [@media_(min-width:1150px)]:text-9xl font-extrabold  text-transparent  relative drop-shadow-2xl
            bg-gradient-to-r from-[var(--color-accent-2)] via-[var(--color-accent-3)] to-[var(--color-accent-1)]  
            bg-clip-text bg-[length:200%_auto]  leading-normal animate-bg-move-w-shadow   transition-all 
            "
          >
            OPEN PLAYLIST
          </h1>

          <h2 className="text-xl [@media_(min-width:1150px)]:text-2xl  flex flex-col text-text-main text-left gap-2">
            <p>
              <span
                className="
                text-transparent  
                bg-gradient-to-r from-[var(--color-accent-2)] via-[var(--color-accent-3)] to-[var(--color-accent-1)] 
                bg-clip-text bg-[length:200%_auto] animate-bg-move"
              >
                OpenPlaylist
              </span>{' '}
              место где плейлисты это нечто общее, а не просто набор треков.
            </p>
          </h2>
        </div>
        <div className="flex  p-2">
          {isAuthenticated ? (
            <Btn
              text="Перейти к плейлистам"
              className="px-4 mt-10 w-[250px] md:w-[450px] h-[60px] md:h-[100px] text-lg md:text-4xl font-bold"
              onClick={() => navigate({ to: '/dashboard' })}
            />
          ) : (
            <Btn
              text="Войти"
              className="px-4 w-[250px] h-[70px] "
              onClick={() =>  navigate({ to: '/login' })}
            />
          )}
        </div>
      </div>

      {/* <div className=" h-[90vh] mt-15 w-full bg-level-1 shadow-2xl">
        <div>Немного статистики</div>
        <div>
          <SearchPlaylist />
        </div>
      </div> */}
    </div>
  )
}
