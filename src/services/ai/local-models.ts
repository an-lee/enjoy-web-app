/**
 * Local Model Service (using @huggingface/transformers)
 * Supports free users and offline usage
 *
 * Note: Requires @huggingface/transformers package
 * bun add @huggingface/transformers
 */

import type { LocalModelConfig } from './types'

export interface LocalASRResult {
  text: string
  segments?: Array<{
    text: string
    start: number
    end: number
  }>
  language?: string
}

export interface LocalTranslationResult {
  translatedText: string
  sourceLanguage?: string
  targetLanguage?: string
}

export interface LocalDictionaryResult {
  word: string
  definitions: Array<{
    partOfSpeech: string
    definition: string
    translation: string
  }>
  contextualExplanation?: string
}

/**
 * Local Model Service
 * Uses transformers.js to run models in the browser
 */
export const localModelService = {
  /**
   * Local ASR (using Whisper model)
   * Must run in Web Worker to avoid blocking UI
   */
  async transcribe(
    audioBlob: Blob,
    language?: string,
    modelConfig?: LocalModelConfig
  ): Promise<LocalASRResult> {
    // TODO: Implement transformers.js ASR
    // 1. Load Whisper model in Web Worker
    // 2. Convert audio Blob to model input format
    // 3. Run inference
    // 4. Return transcription results

    throw new Error('Not implemented: transformers.js ASR integration needed')
  },

  /**
   * Local Translation (using M2M100 or similar translation models)
   */
  async translate(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    modelConfig?: LocalModelConfig
  ): Promise<LocalTranslationResult> {
    // TODO: Implement transformers.js translation
    // Note: Local translation models may not support custom style prompts
    // Only basic translation is available

    throw new Error('Not implemented: transformers.js translation integration needed')
  },

  /**
   * Local Dictionary Lookup (using small LLM models)
   * Note: Dictionary lookup may require larger models, may not be suitable for local execution
   * Or use lighter methods (e.g., pre-trained word vectors + simple generation)
   */
  async lookup(
    word: string,
    context: string | undefined,
    sourceLanguage: string,
    targetLanguage: string,
    modelConfig?: LocalModelConfig
  ): Promise<LocalDictionaryResult> {
    // TODO: Implement transformers.js dictionary lookup
    // Use small LLM or pre-trained word vectors

    throw new Error('Not implemented: transformers.js dictionary integration needed')
  },
}

