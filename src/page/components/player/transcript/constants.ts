/**
 * Transcript Display Constants
 *
 * Shared constants used across transcript display components.
 */

/**
 * Scroll offset from top when positioning active line
 */
export const SCROLL_OFFSET = 120 // px offset from top when scrolling

/**
 * Generate a unique ID for a transcript line element
 */
export const getTranscriptLineId = (lineIndex: number): string => {
  return `transcript-line-${lineIndex}`
}

/**
 * Language display names mapping
 */
export const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  zh: '中文',
  ja: '日本語',
  ko: '한국어',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  pt: 'Português',
  ru: 'Русский',
  it: 'Italiano',
}

