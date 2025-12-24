/**
 * Azure Speech SDK Language Code Utilities
 *
 * Provides functions to normalize BCP 47 language codes to Azure Speech SDK format.
 * Azure Speech SDK requires specific format like "en-US", "zh-CN", etc.
 */

/**
 * Map BCP 47 language codes to Azure Speech SDK language codes
 * Azure Speech SDK requires specific format like "en-US", "zh-CN", etc.
 */
export const AZURE_LANGUAGE_MAP: Record<string, string> = {
  'en': 'en-US',
  'en-US': 'en-US',
  'en-GB': 'en-GB',
  'en-AU': 'en-AU',
  'en-CA': 'en-CA',
  'en-IN': 'en-IN',
  'en-IE': 'en-IE',
  'en-NZ': 'en-NZ',
  'en-ZA': 'en-ZA',
  'zh': 'zh-CN',
  'zh-CN': 'zh-CN',
  'zh-TW': 'zh-TW',
  'zh-HK': 'zh-HK',
  'ja': 'ja-JP',
  'ko': 'ko-KR',
  'es': 'es-ES',
  'es-ES': 'es-ES',
  'es-MX': 'es-MX',
  'es-AR': 'es-AR',
  'es-CO': 'es-CO',
  'es-CL': 'es-CL',
  'es-PE': 'es-PE',
  'es-VE': 'es-VE',
  'fr': 'fr-FR',
  'fr-FR': 'fr-FR',
  'fr-CA': 'fr-CA',
  'de': 'de-DE',
  'de-DE': 'de-DE',
  'de-AT': 'de-AT',
  'de-CH': 'de-CH',
  'pt': 'pt-BR',
  'pt-BR': 'pt-BR',
  'pt-PT': 'pt-PT',
  'it': 'it-IT',
  'ru': 'ru-RU',
  'ar': 'ar-SA',
  'hi': 'hi-IN',
  'th': 'th-TH',
  'vi': 'vi-VN',
  'nl': 'nl-NL',
  'pl': 'pl-PL',
  'tr': 'tr-TR',
  'sv': 'sv-SE',
  'da': 'da-DK',
  'no': 'nb-NO',
  'fi': 'fi-FI',
  'cs': 'cs-CZ',
  'hu': 'hu-HU',
  'ro': 'ro-RO',
  'el': 'el-GR',
}

/**
 * Normalize language code to Azure Speech SDK format
 * Converts BCP 47 codes to Azure-specific format
 *
 * @param language - BCP 47 language code (e.g., "en", "zh-CN", "ja")
 * @returns Azure Speech SDK language code (e.g., "en-US", "zh-CN", "ja-JP")
 *
 * @example
 * normalizeLanguageForAzure("en") // returns "en-US"
 * normalizeLanguageForAzure("zh") // returns "zh-CN"
 * normalizeLanguageForAzure("ja-JP") // returns "ja-JP"
 */
export function normalizeLanguageForAzure(language: string): string {
  // If already in Azure format, return as is
  if (AZURE_LANGUAGE_MAP[language]) {
    return AZURE_LANGUAGE_MAP[language]
  }

  // Try to extract base language and map to default region
  const parts = language.split('-')
  const baseLang = parts[0].toLowerCase()

  // Check if base language has a default mapping
  if (AZURE_LANGUAGE_MAP[baseLang]) {
    return AZURE_LANGUAGE_MAP[baseLang]
  }

  // If no mapping found, try to construct from parts
  if (parts.length >= 2) {
    const constructed = `${parts[0]}-${parts[1].toUpperCase()}`
    if (AZURE_LANGUAGE_MAP[constructed]) {
      return AZURE_LANGUAGE_MAP[constructed]
    }
  }

  // Default to en-US if no mapping found
  return 'en-US'
}

