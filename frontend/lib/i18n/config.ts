import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import uzTranslations from './locales/uz.json'
import ruTranslations from './locales/ru.json'
import enTranslations from './locales/en.json'

const resources = {
  uz: {
    translation: uzTranslations,
  },
  ru: {
    translation: ruTranslations,
  },
  en: {
    translation: enTranslations,
  },
}

// Only initialize if not already initialized
if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: 'uz',
      // Force a deterministic initial language for SSR/CSR hydration.
      // Client language will switch after mount in I18nProvider.
      lng: 'uz',
      debug: false,
      interpolation: {
        escapeValue: false,
      },
      detection: {
        order: ['localStorage', 'navigator', 'htmlTag'],
        caches: ['localStorage'],
        lookupLocalStorage: 'i18nextLng',
      },
      react: {
        useSuspense: false,
      },
    })
}

export default i18n
