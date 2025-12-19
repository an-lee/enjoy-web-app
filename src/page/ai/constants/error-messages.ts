/**
 * AI Service Error Messages
 * User-friendly error messages mapped to error codes
 *
 * Note: Error codes are defined in error-codes.ts
 * These messages are used by the error handler to provide user feedback
 */

export const ERROR_MESSAGES: Record<string, string> = {
  // Translation
  ENJOY_TRANSLATION_ERROR: 'Translation via Enjoy API failed',

  // Smart Translation
  LOCAL_SMART_TRANSLATION_ERROR: 'Local smart translation failed',
  ENJOY_SMART_TRANSLATION_ERROR: 'Smart translation via Enjoy API failed',
  BYOK_SMART_TRANSLATION_ERROR: 'BYOK smart translation failed',

  // Smart Dictionary
  LOCAL_SMART_DICTIONARY_NOT_SUPPORTED:
    'Smart dictionary lookup is not supported in local mode. Please use cloud service.',
  ENJOY_SMART_DICTIONARY_ERROR: 'Smart dictionary lookup via Enjoy API failed',
  BYOK_SMART_DICTIONARY_ERROR: 'BYOK smart dictionary lookup failed',

  // ASR
  LOCAL_ASR_ERROR: 'Local ASR failed',
  AZURE_ASR_ERROR: 'Azure ASR failed',
  ENJOY_ASR_ERROR: 'ASR via Enjoy API failed',
  BYOK_ASR_ERROR: 'BYOK ASR failed',
  BYOK_AZURE_ASR_ERROR: 'BYOK Azure ASR failed',

  // TTS
  LOCAL_TTS_ERROR: 'Local TTS failed',
  AZURE_TTS_ERROR: 'Azure TTS failed',
  ENJOY_TTS_ERROR: 'TTS via Enjoy API failed',
  BYOK_TTS_ERROR: 'BYOK TTS failed',
  BYOK_AZURE_TTS_ERROR: 'BYOK Azure TTS failed',

  // Assessment
  ASSESSMENT_ERROR: 'Pronunciation assessment failed',
  ENJOY_ASSESSMENT_ERROR: 'Pronunciation assessment via Enjoy API failed',
  BYOK_ASSESSMENT_ERROR: 'BYOK pronunciation assessment failed',
  BYOK_ASSESSMENT_PROVIDER_NOT_SUPPORTED:
    'This provider does not support pronunciation assessment. Only Azure Speech is supported.',
}

/**
 * Get error message for an error code
 * @param errorCode - The error code from error-codes.ts
 * @returns User-friendly error message
 */
export function getErrorMessage(errorCode: string): string {
  return ERROR_MESSAGES[errorCode] || 'An unknown error occurred'
}
