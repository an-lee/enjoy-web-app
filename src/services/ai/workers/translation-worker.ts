/**
 * Translation Web Worker
 * Handles translation model loading and inference in a separate thread
 */

import { pipeline, env } from '@huggingface/transformers'

// Configure transformers.js
env.allowLocalModels = false
env.allowRemoteModels = true

// Model configuration
const DEFAULT_TRANSLATION_MODEL = 'onnx-community/Qwen3-0.6B-DQ-ONNX'

interface TranslationWorkerMessage {
  type: 'init' | 'translate' | 'checkStatus'
  data?: {
    model?: string
    text?: string
    srcLang?: string
    tgtLang?: string
    taskId?: string
  }
}

interface TranslationWorkerResponse {
  type: 'progress' | 'ready' | 'result' | 'error' | 'status'
  data?: any
  taskId?: string
}

// Singleton pattern for Text Generation pipeline (for translation via prompts)
class TranslationPipelineSingleton {
  static instance: any = null
  static modelName: string | null = null
  static loading: boolean = false

  static async getInstance(
    modelName: string = DEFAULT_TRANSLATION_MODEL,
    progressCallback?: (progress: any) => void
  ) {
    // If already loaded with the same model, return existing instance
    if (this.instance && this.modelName === modelName) {
      return this.instance
    }

    // If loading, wait for it
    if (this.loading) {
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!this.loading && this.instance) {
            clearInterval(checkInterval)
            resolve(this.instance)
          }
        }, 100)
      })
    }

    // Start loading
    this.loading = true
    this.modelName = modelName

    try {
      // Use text-generation pipeline for generative models
      this.instance = await pipeline('text-generation', modelName, {
        progress_callback: (progress: any) => {
          if (progressCallback) {
            progressCallback(progress)
          }
          // Send progress to main thread
          self.postMessage({
            type: 'progress',
            data: progress,
          } as TranslationWorkerResponse)
        },
      })

      this.loading = false

      // Notify main thread that model is ready
      self.postMessage({
        type: 'ready',
        data: { model: modelName },
      } as TranslationWorkerResponse)

      return this.instance
    } catch (error: any) {
      this.loading = false
      this.instance = null
      this.modelName = null
      throw error
    }
  }

  static isLoaded(): boolean {
    return this.instance !== null
  }

  static getModelName(): string | null {
    return this.modelName
  }
}

// Language name mapping for translation prompts
const LANGUAGE_NAME_MAP: Record<string, string> = {
  en: 'English',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  pt: 'Portuguese',
  // Add more mappings as needed
}

function getLanguageName(code: string): string {
  return LANGUAGE_NAME_MAP[code] || code
}

// Build translation prompt for generative models
function buildTranslationPrompt(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): string {
  const srcLangName = getLanguageName(sourceLanguage)
  const tgtLangName = getLanguageName(targetLanguage)

  return `Translate the following text from ${srcLangName} to ${tgtLangName}. Only output the translation, without any explanation or additional text.

Source text (${srcLangName}): ${text}

Translation (${tgtLangName}):`
}


// Listen for messages from main thread
self.addEventListener('message', async (event: MessageEvent<TranslationWorkerMessage>) => {
  const { type, data } = event.data

  try {
    switch (type) {
      case 'init': {
        // Initialize model
        const modelName = data?.model || DEFAULT_TRANSLATION_MODEL
        await TranslationPipelineSingleton.getInstance(modelName, (progress) => {
          self.postMessage({
            type: 'progress',
            data: progress,
          } as TranslationWorkerResponse)
        })
        break
      }

      case 'checkStatus': {
        // Check if model is loaded
        self.postMessage({
          type: 'status',
          data: {
            loaded: TranslationPipelineSingleton.isLoaded(),
            model: TranslationPipelineSingleton.getModelName(),
          },
        } as TranslationWorkerResponse)
        break
      }

      case 'translate': {
        // Translate text using generative model with prompts
        if (!data?.text || !data?.srcLang || !data?.tgtLang) {
          throw new Error('Text, source language, and target language are required')
        }

        const modelName = data?.model || DEFAULT_TRANSLATION_MODEL
        const generator = await TranslationPipelineSingleton.getInstance(modelName)

        // Build translation prompt
        const prompt = buildTranslationPrompt(data.text, data.srcLang, data.tgtLang)

        // Generate translation
        const result = await generator(prompt, {
          max_new_tokens: 512,
          temperature: 0.3,
          top_p: 0.9,
          return_full_text: false,
        })

        // Extract translated text from generated result
        let translatedText = ''
        if (Array.isArray(result) && result.length > 0) {
          translatedText = result[0].generated_text || result[0].text || ''
        } else if (result.generated_text) {
          translatedText = result.generated_text
        } else if (result.text) {
          translatedText = result.text
        }

        // Clean up the translation (remove any prompt remnants)
        translatedText = translatedText.trim()
        // Remove the prompt if it was included in the output
        if (translatedText.includes('Translation (')) {
          const parts = translatedText.split('Translation (')
          if (parts.length > 1) {
            translatedText = parts[parts.length - 1].split(':')[1]?.trim() || translatedText
          }
        }

        // Send result back to main thread
        self.postMessage({
          type: 'result',
          data: {
            translatedText: translatedText || data.text,
            sourceLanguage: data.srcLang,
            targetLanguage: data.tgtLang,
          },
          taskId: data?.taskId,
        } as TranslationWorkerResponse)
        break
      }

      default:
        throw new Error(`Unknown message type: ${type}`)
    }
  } catch (error: any) {
    self.postMessage({
      type: 'error',
      data: {
        message: error.message || 'Unknown error',
        stack: error.stack,
      },
      taskId: data?.taskId,
    } as TranslationWorkerResponse)
  }
})

