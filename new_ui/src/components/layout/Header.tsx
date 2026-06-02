import { Link, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import Disc from '@/components/icons/icon-disc'
import Dashboard from '@/components/icons/icon-dashboard'
import MenuDropdown from './menu-dropdown'
import Search from '@/components/icons/icon-search'
import { useAuthStore } from '@/stores/authStore'
import {
  Select,
  SelectItem,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function Header() {
  const { t, i18n } = useTranslation()
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  const windowWidth = window.innerWidth

  const languages = [
    { code: 'ru', label: 'Русский' },
    { code: 'en', label: 'English' },
  ]

  const currentLanguage = languages.find(
    (language) => language.code === i18n.language,
  )
  const handleLanguageChange = (
    language: (typeof languages)[number]['code'],
  ) => {
    i18n.changeLanguage(language)
  }

  return (
    <div className="w-full flex sticky top-0 z-50 justify-center">
      <header
        className="px-1 py-2 mx-5 mt-2 flex 
      w-full md:w-[900px] rounded-full bg-level-2 
      text-text-main text-2xl justify-between
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
                  {t('brand.name')}
                  {windowWidth > 600 && ` ${t('brand.version')}`}
                </h1>
              </Link>
            </div>

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

          <div className="flex gap-2 items-center">
            <Select
              value={currentLanguage?.code}
              onValueChange={handleLanguageChange}
            >
              <SelectTrigger
                className="w-fit bg-level-2 text-text-main cursor-pointer
               ring-0 border-0 focus:ring-0 focus:ring-offset-0 focus-within:border-0 focus-visible:border-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none focus:outline-none focus:border-0"
              >
                <SelectValue placeholder={currentLanguage?.label}>
                  <span>{currentLanguage?.code}</span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-level-2  border-0 text-text-main">
                {languages.map((language) => (
                  <SelectItem
                    key={language.code}
                    value={language.code}
                    className="text-text-main focus:bg-level-3"
                  >
                    {language.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isAuthenticated ? (
              <div className="pr-4 ">
                <button
                  className="cursor-pointer"
                  onClick={() => navigate({ to: '/login' })}
                >
                  {t('nav.login')}
                </button>
              </div>
            ) : (
              <div className="flex gap-2 h-[33px] items-center">
                <div className="px-2   flex items-center">
                  <MenuDropdown />
                </div>
              </div>
            )}
          </div>
        </nav>
      </header>
    </div>
  )
}
