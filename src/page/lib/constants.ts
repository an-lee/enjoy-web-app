/**
 * Application Constants
 * Centralized constants for the application
 */

export interface Language {
  value: string
  label: string
}

/**
 * Supported languages list
 * Used across the application for language selection
 */
export const LANGUAGES: Language[] = [
  { value: 'en', label: 'English' },
  { value: 'zh', label: '中文' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'pt', label: 'Português' },
]

