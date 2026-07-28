import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import Backend from 'i18next-http-backend'

export const NAMESPACES = [
  'common',
  'auth',
  'saves',
  'feedback',
  'landing',
  'notifications',
  'player',
  'playlistSettings',
  'playlist',
  'userProfile',
  'userSettings',
] as const

i18n
  .use(Backend)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    lng: 'en',
    supportedLngs: ['ru', 'en', 'ua'],
    ns: NAMESPACES,
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
  })

export default i18n
