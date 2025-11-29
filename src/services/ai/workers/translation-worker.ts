/**
 * Translation Web Worker
 * Handles translation model loading and inference in a separate thread
 */

import { pipeline, env } from '@huggingface/transformers'

// Configure transformers.js
env.allowLocalModels = false
env.allowRemoteModels = true

// Model configuration
const DEFAULT_TRANSLATION_MODEL = 'Xenova/nllb-200-distilled-600M'

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

// Singleton pattern for Translation pipeline
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
      this.instance = await pipeline('translation', modelName, {
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

// Language code mapping for NLLB models
// NLLB uses specific language codes (e.g., 'eng_Latn', 'zho_Hans')
// We'll map common ISO codes to NLLB codes
const LANGUAGE_CODE_MAP: Record<string, string> = {
  en: 'eng_Latn',
  zh: 'zho_Hans',
  ja: 'jpn_Jpan',
  ko: 'kor_Hang',
  es: 'spa_Latn',
  fr: 'fra_Latn',
  de: 'deu_Latn',
  pt: 'por_Latn',
  // Add more mappings as needed
}

function mapLanguageCode(code: string): string {
  return LANGUAGE_CODE_MAP[code] || code
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
        // Translate text
        if (!data?.text || !data?.srcLang || !data?.tgtLang) {
          throw new Error('Text, source language, and target language are required')
        }

        const modelName = data?.model || DEFAULT_TRANSLATION_MODEL
        const translator = await TranslationPipelineSingleton.getInstance(modelName)

        // Map language codes
        const srcLang = mapLanguageCode(data.srcLang)
        const tgtLang = mapLanguageCode(data.tgtLang)

        // Run translation
        const result = await translator(data.text, {
          src_lang: srcLang,
          tgt_lang: tgtLang,
        })

        // Send result back to main thread
        self.postMessage({
          type: 'result',
          data: {
            translatedText: result[0]?.translation_text || result.translatedText || '',
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

