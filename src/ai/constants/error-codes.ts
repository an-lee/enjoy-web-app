/**
 * AI Service Error Codes
 * Centralized error codes for all AI services
 *
 * Note: Basic Dictionary is a regular API service (not AI service).
 * Its error codes are not included here.
 */

// ============================================================================
// Translation Errors (Basic translation - Enjoy AI free)
// ============================================================================
export const ERROR_TRANSLATION_ENJOY = 'ENJOY_TRANSLATION_ERROR'

// ============================================================================
// Smart Translation Errors
// ============================================================================
export const ERROR_SMART_TRANSLATION_LOCAL = 'LOCAL_SMART_TRANSLATION_ERROR'
export const ERROR_SMART_TRANSLATION_ENJOY = 'ENJOY_SMART_TRANSLATION_ERROR'
export const ERROR_SMART_TRANSLATION_BYOK = 'BYOK_SMART_TRANSLATION_ERROR'
export const ERROR_TRANSLATION = 'TRANSLATION_ERROR' // Legacy
export const ERROR_TRANSLATION_LOCAL = 'LOCAL_TRANSLATION_ERROR' // Legacy

// ============================================================================
// Smart Dictionary Errors (Contextual - AI-powered only)
// ============================================================================
export const ERROR_SMART_DICTIONARY_LOCAL_NOT_SUPPORTED = 'LOCAL_SMART_DICTIONARY_NOT_SUPPORTED'
export const ERROR_SMART_DICTIONARY_ENJOY = 'ENJOY_SMART_DICTIONARY_ERROR'
export const ERROR_SMART_DICTIONARY_BYOK = 'BYOK_SMART_DICTIONARY_ERROR'

// ============================================================================
// ASR (Automatic Speech Recognition) Errors
// ============================================================================
export const ERROR_ASR_LOCAL = 'LOCAL_ASR_ERROR'
export const ERROR_ASR_AZURE = 'AZURE_ASR_ERROR'
export const ERROR_ASR_ENJOY = 'ENJOY_ASR_ERROR'
export const ERROR_ASR_BYOK = 'BYOK_ASR_ERROR'
export const ERROR_ASR_BYOK_AZURE = 'BYOK_AZURE_ASR_ERROR'
export const ERROR_ASR_BYOK_AZURE_NOT_IMPLEMENTED = 'BYOK_AZURE_ASR_NOT_IMPLEMENTED'
export const ERROR_ASR_BYOK_PROVIDER_NOT_SUPPORTED = 'BYOK_ASR_PROVIDER_NOT_SUPPORTED'

// ============================================================================
// TTS (Text-to-Speech) Errors
// ============================================================================
export const ERROR_TTS_LOCAL = 'LOCAL_TTS_ERROR'
export const ERROR_TTS_AZURE = 'AZURE_TTS_ERROR'
export const ERROR_TTS_ENJOY = 'ENJOY_TTS_ERROR'
export const ERROR_TTS_BYOK = 'BYOK_TTS_ERROR'
export const ERROR_TTS_BYOK_AZURE = 'BYOK_AZURE_TTS_ERROR'
export const ERROR_TTS_BYOK_AZURE_NOT_IMPLEMENTED = 'BYOK_AZURE_TTS_NOT_IMPLEMENTED'
export const ERROR_TTS_BYOK_PROVIDER_NOT_SUPPORTED = 'BYOK_TTS_PROVIDER_NOT_SUPPORTED'

// ============================================================================
// Pronunciation Assessment Errors
// ============================================================================
export const ERROR_ASSESSMENT = 'ASSESSMENT_ERROR'
export const ERROR_ASSESSMENT_BYOK = 'BYOK_ASSESSMENT_ERROR'
export const ERROR_ASSESSMENT_BYOK_PROVIDER_NOT_SUPPORTED = 'BYOK_ASSESSMENT_PROVIDER_NOT_SUPPORTED'

// ============================================================================
// Error Code Categories (for filtering/grouping)
// ============================================================================
export const ERROR_CATEGORIES = {
  TRANSLATION: [ERROR_TRANSLATION_ENJOY],
  SMART_TRANSLATION: [
    ERROR_SMART_TRANSLATION_LOCAL,
    ERROR_SMART_TRANSLATION_ENJOY,
    ERROR_SMART_TRANSLATION_BYOK,
    ERROR_TRANSLATION,
    ERROR_TRANSLATION_LOCAL,
  ],
  SMART_DICTIONARY: [
    ERROR_SMART_DICTIONARY_LOCAL_NOT_SUPPORTED,
    ERROR_SMART_DICTIONARY_ENJOY,
    ERROR_SMART_DICTIONARY_BYOK,
  ],
  ASR: [
    ERROR_ASR_LOCAL,
    ERROR_ASR_AZURE,
    ERROR_ASR_ENJOY,
    ERROR_ASR_BYOK,
    ERROR_ASR_BYOK_AZURE,
    ERROR_ASR_BYOK_AZURE_NOT_IMPLEMENTED,
    ERROR_ASR_BYOK_PROVIDER_NOT_SUPPORTED,
  ],
  TTS: [
    ERROR_TTS_LOCAL,
    ERROR_TTS_AZURE,
    ERROR_TTS_ENJOY,
    ERROR_TTS_BYOK,
    ERROR_TTS_BYOK_AZURE,
    ERROR_TTS_BYOK_AZURE_NOT_IMPLEMENTED,
    ERROR_TTS_BYOK_PROVIDER_NOT_SUPPORTED,
  ],
  ASSESSMENT: [
    ERROR_ASSESSMENT,
    ERROR_ASSESSMENT_BYOK,
    ERROR_ASSESSMENT_BYOK_PROVIDER_NOT_SUPPORTED,
  ],
} as const

/**
 * Check if an error code belongs to a specific service category
 */
export function isErrorOfCategory(
  errorCode: string,
  category: keyof typeof ERROR_CATEGORIES
): boolean {
  const categoryErrors = ERROR_CATEGORIES[category] as readonly string[]
  return categoryErrors.includes(errorCode)
}

