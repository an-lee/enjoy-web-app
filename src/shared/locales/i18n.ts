import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Import translation files
import en from './en/translation.json'
import zh from './zh/translation.json'
import ja from './ja/translation.json'
import ko from './ko/translation.json'
import es from './es/translation.json'
import fr from './fr/translation.json'
import de from './de/translation.json'
import pt from './pt/translation.json'

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

// Supported languages
const supportedLanguages = Object.keys(resources)

// Check if user has a saved language preference
// SSR-safe: only access localStorage on the client
const hasSavedLanguagePreference = (): boolean => {
  if (typeof window === 'undefined') {
    return false
  }
  try {
    const stored = localStorage.getItem('enjoy-settings')
    if (stored) {
      const settings = JSON.parse(stored)
      if (settings?.state?.preferredLanguage) {
        return true
      }
    }
  } catch {
    // Ignore parsing errors
  }
  return false
}

// Get initial language from settings store if available
// SSR-safe: only access localStorage on the client
const getInitialLanguage = (): string | undefined => {
  if (typeof window === 'undefined') {
    return 'en' // Always use fallback for SSR to avoid hydration mismatch
  }
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
  return 'en' // Use fallback until after hydration
}

const hasSavedPreference = hasSavedLanguagePreference()
const initialLanguage = getInitialLanguage()

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLanguage, // Always set a language to avoid auto-detection during hydration
    fallbackLng: 'en',
    debug: import.meta.env.DEV,
    defaultNS: 'translation',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      // Detection config (used later after hydration)
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    react: {
      useSuspense: false, // Disable suspense for better compatibility
    },
    supportedLngs: supportedLanguages,
  })

// After hydration, detect and set the correct language
// This ensures server and client render the same initial HTML
if (typeof window !== 'undefined') {
  // Wait for React hydration to complete (aligned with RootComponent hydration delay)
  setTimeout(() => {
    let targetLanguage: string | undefined

    if (hasSavedPreference) {
      // Use saved preference
      targetLanguage = initialLanguage
    } else {
      // Detect browser language
      const detected = i18n.services.languageDetector?.detect()

      // Normalize language code (e.g., 'zh-CN' -> 'zh', 'en-US' -> 'en')
      const normalizeLanguage = (lang: string | string[] | undefined): string => {
        if (!lang) return 'en'
        const langStr = Array.isArray(lang) ? lang[0] : lang
        // Extract base language code (e.g., 'zh-CN' -> 'zh')
        const baseLang = langStr.split('-')[0].toLowerCase()
        // Check if we support this language, fallback to 'en' if not
        return supportedLanguages.includes(baseLang) ? baseLang : 'en'
      }

      targetLanguage = normalizeLanguage(detected)
    }

    // Only change language if different from current and after hydration
    if (targetLanguage && targetLanguage !== i18n.language) {
      i18n.changeLanguage(targetLanguage).then(() => {
        // Sync to settings store if no saved preference
        if (!hasSavedPreference) {
          import('@/page/stores/settings').then(({ useSettingsStore }) => {
            const store = useSettingsStore.getState()
            store.setPreferredLanguage(targetLanguage)
          }).catch(() => {
            // Ignore errors if store is not available yet
          })
        }
      })
    }
  }, 50) // Delay to allow hydration to start, language will be ready when skeleton hides
}

export default i18n

