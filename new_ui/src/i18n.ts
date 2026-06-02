import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import Backend from 'i18next-http-backend'

i18n
  .use(Backend) // Загрузка файлов из папки public/locales
  .use(initReactI18next)
  .init({
    fallbackLng: 'ru', // Язык по умолчанию
    lng: 'ru', // Текущий язык
    interpolation: {
      escapeValue: false, // React сам защищает от XSS
    },
    backend: {
      loadPath: '/locales/{{lng}}.json', // Путь к файлам перевода
    },
  })

export default i18n
