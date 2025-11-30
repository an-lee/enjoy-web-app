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
  // Fast Translation (FREE)
  FAST_TRANSLATION: '/api/v1/services/fast-translation',

  // Smart Translation
  SMART_TRANSLATION: '/api/v1/services/translation',

  // Dictionary
  DICTIONARY_BASIC: '/api/v1/services/dictionary/basic',
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
 * Default ASR model (Whisper)
 * @deprecated Import from '@/services/ai/local/constants' instead
 */
export const DEFAULT_ASR_MODEL = 'Xenova/whisper-tiny'

/**
 * Default Smart Translation model (Qwen3)
 * @deprecated Import from '@/services/ai/local/constants' instead
 */
export const DEFAULT_SMART_TRANSLATION_MODEL = 'onnx-community/Qwen3-0.6B-DQ-ONNX'

/**
 * Default Translation model (legacy, maps to Smart Translation)
 * @deprecated Import from '@/services/ai/local/constants' instead
 */
export const DEFAULT_TRANSLATION_MODEL = DEFAULT_SMART_TRANSLATION_MODEL

/**
 * Model loading timeout (milliseconds)
 * @deprecated Import from '@/services/ai/local/constants' instead
 */
export const MODEL_LOADING_TIMEOUT = 300000 // 5 minutes

/**
 * Model inference timeout (milliseconds)
 * @deprecated Import from '@/services/ai/local/constants' instead
 */
export const MODEL_INFERENCE_TIMEOUT = 300000 // 5 minutes

// ============================================================================
// Service Feature Flags
// ============================================================================

/**
 * Service availability matrix
 * Defines which providers support which services
 */
export const SERVICE_SUPPORT_MATRIX = {
  fastTranslation: {
    enjoy: true,
    local: false,
    byok: false,
  },
  smartTranslation: {
    enjoy: true,
    local: true,
    byok: true, // FUTURE
  },
  dictionaryBasic: {
    enjoy: true,
    local: false,
    byok: false,
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
 * Services that are always FREE and don't require configuration
 */
export const FREE_SERVICES = ['fastTranslation', 'dictionaryBasic'] as const

/**
 * Check if a service is always free
 */
export function isFreeService(service: string): boolean {
  return FREE_SERVICES.includes(service as any)
}

// ============================================================================
// Service Display Names
// ============================================================================

export const SERVICE_NAMES = {
  fastTranslation: 'Fast Translation',
  smartTranslation: 'Smart Translation',
  dictionaryBasic: 'Basic Dictionary',
  dictionaryContextual: 'Dictionary (Contextual)',
  asr: 'Speech Recognition (ASR)',
  tts: 'Text-to-Speech (TTS)',
  assessment: 'Pronunciation Assessment',
} as const

