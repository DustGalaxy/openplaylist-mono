import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import Backend from 'i18next-http-backend'

i18n
  .use(Backend) // Загрузка файлов из папки public/locales
  .use(initReactI18next)
  .init({
    fallbackLng: 'ru',
    lng: 'ru',
    supportedLngs: ['ru', 'en'],
    interpolation: {
      escapeValue: false,
    },
    backend: {
      loadPath: '/locales/{{lng}}.json',
    },
  })

export default i18n
