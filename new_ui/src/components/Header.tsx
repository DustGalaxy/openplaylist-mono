import { Link } from '@tanstack/react-router'
import Disc from './icons/icon-disc'
import Dashboard from './icons/icon-dashboard'
// import News from './icons/icon-news'
// import Notifications from './icons/icon-notifications'
// import Menu from './icons/icon-menu'
import MenuDropdown from './menu-dropdown'
import Search from './icons/icon-search'
import { useAuthStore } from '@/stores/authStore'

import { useTwitchLoginUrl } from '@/hooks/useAuthUrl'

export default function Header() {
  const { isAuthenticated, user } = useAuthStore()

  const handleTwitchLogin = useTwitchLoginUrl()

  return (
    <div className="w-full flex sticky top-0 z-50 justify-center">
      <header
        className="px-1 py-2 mx-5 mt-2 flex 
      w-full md:w-[900px] rounded-full bg-level-2 
      text-white text-2xl justify-between
      border-2 border-level-3 shadow-[-1px_1px_6px_rgba(0,0,0,0.4),-1px_1px_4px_rgba(0,0,0,0.3)]
      sm:shadow-[-2px_2px_10px_rgba(0,0,0,0.45),-2px_2px_4px_rgba(0,0,0,0.35)]"
      >
        <nav className="flex flex-row justify-between w-full  gap-2  items-center">
          <div className="flex gap-2">
            <div className="px-2 ">
              <Link to="/" className="flex gap-2 ">
                <Disc />
                <h1
                  className="text-xl font-bold  text-transparent  relative drop-shadow-2xl
                  bg-gradient-to-r from-[var(--color-accent-2)] via-[var(--color-accent-3)] to-[var(--color-accent-1)]  
                  bg-clip-text bg-[length:200%_auto]  leading-normal animate-bg-move transition-all"
                >
                  OpenPlaylist v2026.1b
                </h1>
              </Link>
            </div>

            {/* <div className="px-2">
              <Link to="/news" disabled >
                <News />
              </Link>
            </div> */}
            {isAuthenticated && (
              <div className="px-2 ">
                <Link to="/dashboard">
                  <Dashboard />
                </Link>
              </div>
            )}

            <div className="px-2 ">
              <Link to="/view">
                <Search />
              </Link>
            </div>
          </div>
          {!isAuthenticated ? (
            <div className="pr-1">
              <button onClick={() => handleTwitchLogin()}>
                Login with Twitch
              </button>
            </div>
          ) : (
            <div className="flex gap-2 h-[33px] items-center">
              {/* <div className="px-2 ">
            <Link to="/" className="relative">
              <div className="relative">
                <div className="absolute  top-[3px] right-[3px] w-3 h-3 bg-red-500 rounded-full border-2 border-level-2" />
                <Notifications />
              </div>
            </Link>
          </div> */}
              <div className="px-2   flex items-center">
                <MenuDropdown user={user} />
              </div>
            </div>
          )}
        </nav>
      </header>
    </div>
  )
}
