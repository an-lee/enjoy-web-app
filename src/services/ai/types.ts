/**
 * AI Service Type Definitions
 */

/**
 * AI Service Provider Types
 * - 'enjoy': Use Enjoy API managed services (requires subscription or quota)
 * - 'byok': Use user's own API keys (future implementation)
 * - 'local': Use browser-local transformers.js models (free, offline-capable)
 */
export type AIProvider = 'enjoy' | 'byok' | 'local'

/**
 * Service Types
 */
export type AIServiceType =
  | 'translation'
  | 'tts'
  | 'assessment'
  | 'dictionary'
  | 'asr'

/**
 * Local Model Configuration
 */
export interface LocalModelConfig {
  model?: string // Model name, e.g., 'Xenova/whisper-tiny', 'Xenova/m2m100_418M'
  quantized?: boolean // Whether to use quantized models (smaller and faster)
  device?: 'cpu' | 'gpu' // Runtime device (transformers.js mainly supports CPU)
}

/**
 * Service Configuration (supports BYOK and local mode)
 */
export interface AIServiceConfig {
  provider: AIProvider
  // API keys configuration for BYOK (future implementation)
  apiKeys?: {
    openai?: string
    azure?: {
      subscriptionKey: string
      region: string
    }
  }
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

