/**
 * AI Service Error Codes
 * Centralized error codes for all AI services
 *
 * Naming Convention: ERROR_{SERVICE}_{PROVIDER}[_{DETAIL}]
 * - SERVICE: TRANSLATION, SMART_TRANSLATION, SMART_DICTIONARY, ASR, TTS, ASSESSMENT
 * - PROVIDER: ENJOY, LOCAL, BYOK, AZURE
 * - DETAIL: Optional detail (e.g., NOT_SUPPORTED, NOT_IMPLEMENTED)
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

// ============================================================================
// Smart Dictionary Errors (Contextual - AI-powered)
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

// ============================================================================
// TTS (Text-to-Speech) Errors
// ============================================================================
export const ERROR_TTS_LOCAL = 'LOCAL_TTS_ERROR'
export const ERROR_TTS_AZURE = 'AZURE_TTS_ERROR'
export const ERROR_TTS_ENJOY = 'ENJOY_TTS_ERROR'
export const ERROR_TTS_BYOK = 'BYOK_TTS_ERROR'
export const ERROR_TTS_BYOK_AZURE = 'BYOK_AZURE_TTS_ERROR'

// ============================================================================
// Pronunciation Assessment Errors
// ============================================================================
export const ERROR_ASSESSMENT = 'ASSESSMENT_ERROR'
export const ERROR_ASSESSMENT_ENJOY = 'ENJOY_ASSESSMENT_ERROR'
export const ERROR_ASSESSMENT_BYOK = 'BYOK_ASSESSMENT_ERROR'
export const ERROR_ASSESSMENT_BYOK_PROVIDER_NOT_SUPPORTED = 'BYOK_ASSESSMENT_PROVIDER_NOT_SUPPORTED'
