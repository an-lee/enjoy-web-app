/**
 * AI Service Configuration Constants
 * Centralized configuration values for AI services
 */

// ============================================================================
// API Configuration
// ============================================================================

/**
 * Enjoy API base URL
 * Can be overridden via VITE_ENJOY_API_URL environment variable
 */
export const ENJOY_API_BASE_URL =
  import.meta.env.VITE_ENJOY_API_URL || '/api/v1'

/**
 * Default API timeout (milliseconds)
 */
export const DEFAULT_API_TIMEOUT = 30000 // 30 seconds

/**
 * Long running API timeout (for model-heavy operations)
 */
export const LONG_API_TIMEOUT = 300000 // 5 minutes

// ============================================================================
// Service Endpoints
// ============================================================================

export const API_ENDPOINTS = {
  // Smart Translation
  SMART_TRANSLATION: '/api/v1/services/translation',

  // Dictionary (contextual - AI-powered)
  DICTIONARY_CONTEXTUAL: '/api/v1/services/dictionary',

  // ASR (Speech-to-Text)
  ASR: '/api/v1/services/asr',

  // TTS (Text-to-Speech)
  TTS: '/api/v1/services/tts',

  // Pronunciation Assessment
  ASSESSMENT: '/api/v1/services/assessment',

  // Azure Speech Token
  AZURE_SPEECH_TOKEN: '/api/v1/services/azure-speech/token',
} as const

// ============================================================================
// Local Model Configuration
// ============================================================================

/**
 * Note: Local model configuration constants have been moved to '@/services/ai/local/constants'.
 * Import them from there instead.
 */

// ============================================================================
// Service Feature Flags
// ============================================================================

/**
 * Service availability matrix
 * Defines which providers support which services
 */
export const SERVICE_SUPPORT_MATRIX = {
  smartTranslation: {
    enjoy: true,
    local: true,
    byok: true, // FUTURE
  },
  dictionaryContextual: {
    enjoy: true,
    local: true,
    byok: true, // FUTURE
  },
  asr: {
    enjoy: true,
    local: true,
    byok: true, // FUTURE
  },
  tts: {
    enjoy: true,
    local: true,
    byok: true, // FUTURE
  },
  assessment: {
    enjoy: true,
    local: false,
    byok: true, // FUTURE (Azure only)
  },
} as const

/**
 * Check if a service is supported by a provider
 */
export function isServiceSupported(
  service: keyof typeof SERVICE_SUPPORT_MATRIX,
  provider: 'enjoy' | 'local' | 'byok'
): boolean {
  return SERVICE_SUPPORT_MATRIX[service][provider]
}

// ============================================================================
// BYOK Provider Configuration
// ============================================================================

/**
 * Supported BYOK providers
 */
export const BYOK_PROVIDERS = {
  OPENAI: 'openai',
  GOOGLE: 'google',
  CLAUDE: 'claude',
  AZURE: 'azure',
  CUSTOM: 'custom',
} as const

/**
 * BYOK service support by provider
 */
export const BYOK_PROVIDER_SUPPORT = {
  openai: {
    smartTranslation: true,
    dictionaryContextual: true,
    asr: true,
    tts: true,
    assessment: false,
  },
  google: {
    smartTranslation: true,
    dictionaryContextual: true,
    asr: false,
    tts: false,
    assessment: false,
  },
  claude: {
    smartTranslation: true,
    dictionaryContextual: true,
    asr: false,
    tts: false,
    assessment: false,
  },
  azure: {
    smartTranslation: true,
    dictionaryContextual: true,
    asr: true,
    tts: true,
    assessment: true,
  },
  custom: {
    smartTranslation: true,
    dictionaryContextual: true,
    asr: true,
    tts: true,
    assessment: false,
  },
} as const

// ============================================================================
// Free Services
// ============================================================================

/**
 * Note: Fast Translation and Basic Dictionary are regular API services (not AI services).
 * They are always free and don't require AI configuration.
 * Import them from '@/lib/api' instead of '@/services/ai'.
 */

// ============================================================================
// Service Display Names
// ============================================================================

export const SERVICE_NAMES = {
  smartTranslation: 'Smart Translation',
  dictionaryContextual: 'Dictionary (Contextual)',
  asr: 'Speech Recognition (ASR)',
  tts: 'Text-to-Speech (TTS)',
  assessment: 'Pronunciation Assessment',
} as const

