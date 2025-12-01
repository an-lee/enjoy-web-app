/**
 * AI Service Core Type Definitions
 * Enums and configuration interfaces
 */

/**
 * AI Service Type Enum
 * Use these instead of hardcoded strings
 */
export enum AIServiceType {
  SMART_TRANSLATION = 'smartTranslation',
  SMART_DICTIONARY = 'smartDictionary',
  ASR = 'asr',
  TTS = 'tts',
  ASSESSMENT = 'assessment',
}

/**
 * AI Provider Enum
 * Use these instead of hardcoded strings
 * - 'enjoy': Use Enjoy API managed services (OpenAI-compatible, requires subscription or quota)
 * - 'byok': Use user's own API keys (future implementation for OpenAI, Google, Claude, etc.)
 * - 'local': Use browser-local transformers.js models (free, offline-capable)
 */
export enum AIProvider {
  ENJOY = 'enjoy',
  LOCAL = 'local',
  BYOK = 'byok',
}

/**
 * BYOK Provider Enum
 * Use these instead of hardcoded strings
 * Supported providers for Bring Your Own Key
 */
export enum BYOKProvider {
  OPENAI = 'openai',
  GOOGLE = 'google',
  CLAUDE = 'claude',
  AZURE = 'azure',
  CUSTOM = 'custom',
}

/**
 * Local Model Configuration
 */
export interface LocalModelConfig {
  model?: string // Model name, e.g., 'Xenova/whisper-tiny', 'Xenova/m2m100_418M'
  quantized?: boolean // Whether to use quantized models (smaller and faster)
  device?: 'cpu' | 'gpu' // Runtime device (transformers.js mainly supports CPU)
}

/**
 * BYOK Configuration
 * Unified configuration for all BYOK providers
 */
export interface BYOKConfig {
  provider: BYOKProvider
  apiKey: string
  endpoint?: string // Custom endpoint (for 'custom' provider or Azure)
  region?: string // Azure region (for Azure services)
  model?: string // Model name (optional, for provider-specific models)
}

/**
 * Service Configuration (supports BYOK and local mode)
 */
export interface AIServiceConfig {
  provider: AIProvider
  // BYOK configuration (used when provider === 'byok')
  // All BYOK providers use OpenAI-compatible API format
  // Provider-specific adapters handle API differences
  byok?: BYOKConfig
  // Local model configuration (used when provider === 'local')
  localModel?: LocalModelConfig
}

/**
 * Unified AI Service Response
 */
export interface AIServiceResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
  metadata?: {
    serviceType: AIServiceType
    provider: AIProvider
    tokensUsed?: number
    cost?: number
  }
}

