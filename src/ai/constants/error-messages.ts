/**
 * AI Service Error Messages
 * Centralized error messages for all AI services
 *
 * Note: Error codes are in error-codes.ts
 * These are user-friendly error messages
 */

// ============================================================================
// Smart Translation Error Messages
// ============================================================================

export const ERROR_MESSAGES = {
  LOCAL_SMART_TRANSLATION_ERROR: 'Local smart translation failed',
  ENJOY_SMART_TRANSLATION_ERROR: 'Smart translation via Enjoy API failed',
  BYOK_SMART_TRANSLATION_ERROR: 'BYOK smart translation failed',

  // ============================================================================
  // Smart Dictionary Error Messages
  // ============================================================================
  LOCAL_SMART_DICTIONARY_NOT_SUPPORTED: 'Smart dictionary lookup is not supported in local mode. Please use cloud service.',
  ENJOY_SMART_DICTIONARY_ERROR: 'Smart dictionary lookup via Enjoy API failed',
  BYOK_SMART_DICTIONARY_ERROR: 'BYOK smart dictionary lookup failed',

  // ============================================================================
  // ASR Error Messages
  // ============================================================================
  LOCAL_ASR_ERROR: 'Local ASR failed',
  AZURE_ASR_ERROR: 'Azure ASR failed',
  ENJOY_ASR_ERROR: 'ASR via Enjoy API failed',
  BYOK_ASR_ERROR: 'BYOK ASR failed',
  BYOK_AZURE_ASR_ERROR: 'BYOK Azure ASR failed',
  BYOK_AZURE_ASR_NOT_IMPLEMENTED: 'Azure Speech ASR with BYOK should use the existing azureSpeechService.transcribeWithKey() method',
  BYOK_ASR_PROVIDER_NOT_SUPPORTED: (provider: string) => `Provider ${provider} does not support ASR`,

  // ============================================================================
  // TTS Error Messages
  // ============================================================================
  LOCAL_TTS_ERROR: 'Local TTS failed',
  AZURE_TTS_ERROR: 'Azure TTS failed',
  ENJOY_TTS_ERROR: 'TTS via Enjoy API failed',
  BYOK_TTS_ERROR: 'BYOK TTS failed',
  BYOK_AZURE_TTS_ERROR: 'BYOK Azure TTS failed',
  BYOK_AZURE_TTS_NOT_IMPLEMENTED: 'Azure Speech TTS with BYOK should use the existing azureSpeechService.synthesizeWithKey() method',
  BYOK_TTS_PROVIDER_NOT_SUPPORTED: (provider: string) => `Provider ${provider} does not support TTS`,

  // ============================================================================
  // Assessment Error Messages
  // ============================================================================
  ASSESSMENT_ERROR: 'Pronunciation assessment failed',
  BYOK_ASSESSMENT_ERROR: 'BYOK pronunciation assessment failed',
  BYOK_ASSESSMENT_PROVIDER_NOT_SUPPORTED: (provider: string) => `Provider ${provider} does not support pronunciation assessment. Only Azure Speech is supported.`,
} as const

/**
 * Get error message for an error code
 */
export function getErrorMessage(errorCode: string, ...args: unknown[]): string {
  const message = ERROR_MESSAGES[errorCode as keyof typeof ERROR_MESSAGES]

  if (typeof message === 'function') {
    // Type assertion needed for function calls with dynamic args
    return (message as (...args: unknown[]) => string)(...args)
  }

  return message || 'An unknown error occurred'
}

