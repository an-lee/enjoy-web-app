import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Import translation files
import en from '../locales/en/translation.json'
import zh from '../locales/zh/translation.json'
import ja from '../locales/ja/translation.json'
import ko from '../locales/ko/translation.json'
import es from '../locales/es/translation.json'
import fr from '../locales/fr/translation.json'
import de from '../locales/de/translation.json'
import pt from '../locales/pt/translation.json'

const resources = {
  en: { translation: en },
  zh: { translation: zh },
  ja: { translation: ja },
  ko: { translation: ko },
  es: { translation: es },
  fr: { translation: fr },
  de: { translation: de },
  pt: { translation: pt },
}

// Get initial language from settings store if available
const getInitialLanguage = (): string => {
  try {
    const stored = localStorage.getItem('enjoy-settings')
    if (stored) {
      const settings = JSON.parse(stored)
      if (settings?.state?.preferredLanguage) {
        return settings.state.preferredLanguage
      }
    }
  } catch {
    // Ignore parsing errors
  }
  return 'en'
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: getInitialLanguage(),
    fallbackLng: 'en',
    debug: import.meta.env.DEV,
    defaultNS: 'translation',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    react: {
      useSuspense: false, // Disable suspense for better compatibility
    },
  })

export default i18n

