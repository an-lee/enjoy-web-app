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
    return undefined // Let LanguageDetector handle it for SSR
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
  return undefined // No saved preference, let LanguageDetector detect
}

const hasSavedPreference = hasSavedLanguagePreference()
const initialLanguage = getInitialLanguage()

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    // Only set lng if we have a saved preference, otherwise let LanguageDetector handle it
    ...(initialLanguage ? { lng: initialLanguage } : {}),
    fallbackLng: 'en',
    debug: import.meta.env.DEV,
    defaultNS: 'translation',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      // If no saved preference, prioritize browser language detection
      // Otherwise, use saved preference from localStorage
      order: hasSavedPreference
        ? ['localStorage', 'navigator', 'htmlTag']
        : ['navigator', 'htmlTag', 'localStorage'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    react: {
      useSuspense: false, // Disable suspense for better compatibility
    },
    supportedLngs: supportedLanguages,
  })

// After initialization, sync detected language to settings store if no saved preference
// This ensures the language is detected and saved for first-time users
if (typeof window !== 'undefined' && !hasSavedPreference) {
  // Small delay to ensure hydration is complete and i18n is fully initialized
  setTimeout(() => {
    const detected = i18n.language || i18n.services.languageDetector?.detect()

    // Normalize language code (e.g., 'zh-CN' -> 'zh', 'en-US' -> 'en')
    const normalizeLanguage = (lang: string | string[] | undefined): string => {
      if (!lang) return 'en'
      const langStr = Array.isArray(lang) ? lang[0] : lang
      // Extract base language code (e.g., 'zh-CN' -> 'zh')
      const baseLang = langStr.split('-')[0].toLowerCase()
      // Check if we support this language, fallback to 'en' if not
      return supportedLanguages.includes(baseLang) ? baseLang : 'en'
    }

    const normalizedLang = normalizeLanguage(detected)

    // Only update if detected language is different from current
    if (normalizedLang && normalizedLang !== i18n.language) {
      i18n.changeLanguage(normalizedLang).then(() => {
        // Sync to settings store
        // Use dynamic import to avoid circular dependency
        import('../stores/settings').then(({ useSettingsStore }) => {
          const store = useSettingsStore.getState()
          // Only update if still no saved preference (user might have changed it)
          if (!hasSavedLanguagePreference()) {
            store.setPreferredLanguage(normalizedLang)
          }
        }).catch(() => {
          // Ignore errors if store is not available yet
        })
      })
    }
  }, 100)
}

export default i18n

