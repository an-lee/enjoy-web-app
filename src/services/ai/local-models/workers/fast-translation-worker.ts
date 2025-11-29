/**
 * Fast Translation Web Worker
 * Handles fast translation using dedicated translation models (e.g., NLLB)
 * Optimized for speed, used for subtitle translation
 */

import { pipeline, env } from '@huggingface/transformers'
import { mapToNLLBCode } from '../../prompts'

// Configure transformers.js
env.allowLocalModels = false
env.allowRemoteModels = true

// Model configuration - use dedicated translation models for speed
const DEFAULT_FAST_TRANSLATION_MODEL = 'Xenova/nllb-200-distilled-600M'

interface FastTranslationWorkerMessage {
  type: 'init' | 'translate' | 'checkStatus'
  data?: {
    model?: string
    text?: string
    srcLang?: string
    tgtLang?: string
    taskId?: string
  }
}

interface FastTranslationWorkerResponse {
  type: 'progress' | 'ready' | 'result' | 'error' | 'status'
  data?: any
  taskId?: string
}

// Singleton pattern for Translation pipeline
class FastTranslationPipelineSingleton {
  static instance: any = null
  static modelName: string | null = null
  static loading: boolean = false

  static async getInstance(
    modelName: string = DEFAULT_FAST_TRANSLATION_MODEL,
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
      // Use translation pipeline for dedicated translation models
      this.instance = await pipeline('translation', modelName, {
        progress_callback: (progress: any) => {
          if (progressCallback) {
            progressCallback(progress)
          }
          // Send progress to main thread
          self.postMessage({
            type: 'progress',
            data: progress,
          } as FastTranslationWorkerResponse)
        },
      })

      this.loading = false

      // Notify main thread that model is ready
      self.postMessage({
        type: 'ready',
        data: { model: modelName },
      } as FastTranslationWorkerResponse)

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


// Listen for messages from main thread
self.addEventListener('message', async (event: MessageEvent<FastTranslationWorkerMessage>) => {
  const { type, data } = event.data

  try {
    switch (type) {
      case 'init': {
        // Initialize model
        const modelName = data?.model || DEFAULT_FAST_TRANSLATION_MODEL
        await FastTranslationPipelineSingleton.getInstance(modelName, (progress) => {
          self.postMessage({
            type: 'progress',
            data: progress,
          } as FastTranslationWorkerResponse)
        })
        break
      }

      case 'checkStatus': {
        // Check if model is loaded
        self.postMessage({
          type: 'status',
          data: {
            loaded: FastTranslationPipelineSingleton.isLoaded(),
            model: FastTranslationPipelineSingleton.getModelName(),
          },
        } as FastTranslationWorkerResponse)
        break
      }

      case 'translate': {
        // Fast translation using dedicated translation model
        if (!data?.text || !data?.srcLang || !data?.tgtLang) {
          throw new Error('Text, source language, and target language are required')
        }

        const modelName = data?.model || DEFAULT_FAST_TRANSLATION_MODEL
        const translator = await FastTranslationPipelineSingleton.getInstance(modelName)

        // Map language codes for NLLB (using shared utility)
        const srcLang = mapToNLLBCode(data.srcLang)
        const tgtLang = mapToNLLBCode(data.tgtLang)

        // Run translation
        const result = await translator(data.text, {
          src_lang: srcLang,
          tgt_lang: tgtLang,
        })

        // Extract translated text
        let translatedText = ''
        if (Array.isArray(result) && result.length > 0) {
          translatedText = result[0].translation_text || result[0].translatedText || ''
        } else if (result.translation_text) {
          translatedText = result.translation_text
        } else if (result.translatedText) {
          translatedText = result.translatedText
        } else if (typeof result === 'string') {
          translatedText = result
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
        } as FastTranslationWorkerResponse)
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
    } as FastTranslationWorkerResponse)
  }
})

