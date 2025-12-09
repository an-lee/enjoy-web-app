/**
 * Language Utilities
 * Language code and name mappings for prompts
 */

/**
 * Language name mapping for prompts
 * Maps ISO language codes to full language names
 */
export const LANGUAGE_NAME_MAP: Record<string, string> = {
  en: 'English',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  pt: 'Portuguese',
  // Add more mappings as needed
}

/**
 * Get full language name from language code
 */
export function getLanguageName(code: string): string {
  return LANGUAGE_NAME_MAP[code] || code
}

/**
 * Language code mapping for NLLB models
 * NLLB uses specific language codes (e.g., 'eng_Latn', 'zho_Hans')
 */
export const NLLB_LANGUAGE_CODE_MAP: Record<string, string> = {
  en: 'eng_Latn',
  zh: 'zho_Hans',
  ja: 'jpn_Jpan',
  ko: 'kor_Hang',
  es: 'spa_Latn',
  fr: 'fra_Latn',
  de: 'deu_Latn',
  pt: 'por_Latn',
  // Add more mappings as needed
}

/**
 * Map language code to NLLB format
 */
export function mapToNLLBCode(code: string): string {
  return NLLB_LANGUAGE_CODE_MAP[code] || code
}

