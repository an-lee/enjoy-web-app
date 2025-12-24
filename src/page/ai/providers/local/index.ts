/**
 * Local Model Service (using @huggingface/transformers)
 * Supports free users and offline usage
 *
 * Note: Requires @huggingface/transformers package
 * bun add @huggingface/transformers
 */

import type { LocalModelConfig } from '../../types'
import { useLocalModelsStore } from '@/page/stores/local-models'
import { transcribe } from './services/asr-service'
import { smartTranslate } from './services/smart-translation-service'
import { contextualTranslate } from './services/contextual-translation-service'
import { lookup } from './services/dictionary-service'
import { synthesize } from './services/tts-service'
import { initializeModel, checkModelCache, checkModelLoaded } from './services/model-initializer'

// Re-export types
export type {
  LocalASRResult,
  LocalTranslationResult,
  LocalDictionaryResult,
  LocalTTSResult,
} from './types'

// Re-export constants and model options
export * from './constants'

/**
 * Local Model Service
 * Uses transformers.js to run models in the browser
 */
export const localModelService = {
  /**
   * Local ASR (using Whisper model)
   * Must run in Web Worker to avoid blocking UI
   */
  transcribe,

  /**
   * Smart Translation (using generative models with style support)
   * Supports different translation styles via prompts, used for user-generated content
   */
  smartTranslate,

  /**
   * Contextual Translation (using generative models with context)
   * Uses surrounding text context to provide better translations
   */
  contextualTranslate,

  /**
   * Legacy: Local Translation (for backward compatibility)
   * Maps to smart translation
   */
  async translate(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    modelConfig?: LocalModelConfig
  ) {
    return smartTranslate(text, sourceLanguage, targetLanguage, 'natural', undefined, modelConfig)
  },

  /**
   * Local Dictionary Lookup (using generative models with prompts)
   * Uses dedicated dictionary worker with generative model (e.g., Qwen3)
   */
  lookup,

  /**
   * Local TTS (using browser Web Speech API or transformers.js TTS models)
   */
  synthesize,

  /**
   * Initialize model (preload for faster inference)
   */
  initializeModel,

  /**
   * Check if model is cached
   */
  checkModelCache,

  /**
   * Check if model is already loaded in worker
   */
  checkModelLoaded,

  /**
   * Check model status
   */
  getModelStatus(modelType: 'asr' | 'smartTranslation' | 'smartDictionary' | 'tts') {
    return useLocalModelsStore.getState().models[modelType]
  },
}

// Note: Pronunciation assessment is not supported in local mode
// It requires Azure Speech Services for accurate phoneme-level analysis

