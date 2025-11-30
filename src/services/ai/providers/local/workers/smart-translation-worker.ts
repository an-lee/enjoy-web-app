/**
 * Smart Translation Web Worker
 * Handles smart translation using generative models (e.g., Qwen3) with style support
 * Supports different translation styles via prompts, used for user-generated content
 */

import { pipeline, env } from '@huggingface/transformers'
import { buildSmartTranslationPrompt } from '../../../prompts'
import { DEFAULT_SMART_TRANSLATION_MODEL } from '../constants'

// Configure transformers.js
env.allowLocalModels = false
env.allowRemoteModels = true

interface SmartTranslationWorkerMessage {
  type: 'init' | 'translate' | 'checkStatus'
  data?: {
    model?: string
    text?: string
    srcLang?: string
    tgtLang?: string
    style?: string
    customPrompt?: string
    taskId?: string
  }
}

interface SmartTranslationWorkerResponse {
  type: 'progress' | 'ready' | 'result' | 'error' | 'status'
  data?: any
  taskId?: string
}

// Singleton pattern for Text Generation pipeline (for smart translation via prompts)
class SmartTranslationPipelineSingleton {
  static instance: any = null
  static modelName: string | null = null
  static loading: boolean = false

  static async getInstance(
    modelName: string = DEFAULT_SMART_TRANSLATION_MODEL,
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
        device: 'webgpu',
        progress_callback: (progress: any) => {
          if (progressCallback) {
            progressCallback(progress)
          }
          // Send progress to main thread
          self.postMessage({
            type: 'progress',
            data: progress,
          } as SmartTranslationWorkerResponse)
        },
      })

      this.loading = false

      // Notify main thread that model is ready
      self.postMessage({
        type: 'ready',
        data: { model: modelName },
      } as SmartTranslationWorkerResponse)

      return this.instance
    } catch (error: any) {
      this.loading = false
      this.instance = null
      this.modelName = null

      // Log detailed error for debugging
      console.error('[SmartTranslationPipeline] Failed to load model:', modelName)
      console.error('Error object:', error)
      console.error('Error message:', error?.message)
      console.error('Error stack:', error?.stack)
      console.error('Error name:', error?.name)
      console.error('Error cause:', error?.cause)
      console.error('Error string:', String(error))
      console.error('Error JSON:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))

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
self.addEventListener('message', async (event: MessageEvent<SmartTranslationWorkerMessage>) => {
  const { type, data } = event.data

  try {
    switch (type) {
      case 'init': {
        // Initialize model
        const modelName = data?.model || DEFAULT_SMART_TRANSLATION_MODEL
        await SmartTranslationPipelineSingleton.getInstance(modelName, (progress) => {
          self.postMessage({
            type: 'progress',
            data: progress,
          } as SmartTranslationWorkerResponse)
        })
        break
      }

      case 'checkStatus': {
        // Check if model is loaded
        self.postMessage({
          type: 'status',
          data: {
            loaded: SmartTranslationPipelineSingleton.isLoaded(),
            model: SmartTranslationPipelineSingleton.getModelName(),
          },
        } as SmartTranslationWorkerResponse)
        break
      }

      case 'translate': {
        // Smart translation using generative model with style support
        if (!data?.text || !data?.srcLang || !data?.tgtLang) {
          throw new Error('Text, source language, and target language are required')
        }

        const modelName = data?.model || DEFAULT_SMART_TRANSLATION_MODEL
        const generator = await SmartTranslationPipelineSingleton.getInstance(modelName)

        // Build translation prompt with style (using shared prompt builder)
        const { systemPrompt, userPrompt } = buildSmartTranslationPrompt(
          data.text,
          data.srcLang,
          data.tgtLang,
          (data.style || 'natural') as any,
          data.customPrompt
        )

        // Use messages format for transformers.js (supports system and user roles)
        const messages = [
          { role: 'system' as const, content: systemPrompt },
          { role: 'user' as const, content: userPrompt },
        ]

        // Generate translation with stricter parameters for smaller models
        const result = await generator(messages, {
          max_new_tokens: 512, // Reduced to prevent excessive output
          temperature: 0.1, // Lower temperature for more deterministic output
          top_p: 0.8,
          return_full_text: false
        })

        // Extract translated text from generated result
        // When using messages format, the output structure may be different
        let translatedText = ''
        if (Array.isArray(result) && result.length > 0) {
          const firstResult = result[0]
          // Check for messages format output: generated_text.at(-1).content
          if (firstResult.generated_text && Array.isArray(firstResult.generated_text)) {
            const lastMessage = firstResult.generated_text.at(-1)
            translatedText = lastMessage?.content || ''
          } else {
            // Standard format
            translatedText = firstResult.generated_text || firstResult.text || ''
          }
        } else if (result.generated_text) {
          // Check if it's an array (messages format)
          if (Array.isArray(result.generated_text)) {
            const lastMessage = result.generated_text.at(-1)
            translatedText = lastMessage?.content || ''
          } else {
            translatedText = result.generated_text
          }
        } else if (result.text) {
          translatedText = result.text
        }

        // Aggressive cleanup for smaller models that add explanations
        translatedText = translatedText.trim()

        // Remove repeated "Final Answer" sections
        if (translatedText.includes('**Final Answer**')) {
          // Extract only the last translation before any "Final Answer" marker
          const parts = translatedText.split('**Final Answer**')
          if (parts.length > 1) {
            // Take the content after the last "Final Answer" marker
            translatedText = parts[parts.length - 1].trim()
          }
        }

        // Remove the original prompt if it was included in the output
        if (translatedText.includes('Translate to')) {
          const lines = translatedText.split('\n')
          // Find the first line that doesn't look like part of the prompt
          const startIdx = lines.findIndex(
            (line) =>
              !line.includes('Translate to') &&
              !line.includes('Style:') &&
              !line.trim().startsWith('Input:') &&
              !line.trim().startsWith('Output:') &&
              line.trim().length > 0
          )
          if (startIdx >= 0) {
            translatedText = lines.slice(startIdx).join('\n').trim()
          }
        }

        // Remove any remaining prompt remnants
        if (translatedText.includes('Translation (')) {
          const parts = translatedText.split('Translation (')
          if (parts.length > 1) {
            translatedText = parts[parts.length - 1].split(':')[1]?.trim() || translatedText
          }
        }

        // Final cleanup: remove empty lines and excessive whitespace
        translatedText = translatedText
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.length > 0)
          .join(' ')
          .trim()

        // Send result back to main thread
        self.postMessage({
          type: 'result',
          data: {
            translatedText: translatedText || data.text,
            sourceLanguage: data.srcLang,
            targetLanguage: data.tgtLang,
          },
          taskId: data?.taskId,
        } as SmartTranslationWorkerResponse)
        break
      }

      default:
        throw new Error(`Unknown message type: ${type}`)
    }
  } catch (error: any) {
    // Log detailed error information for debugging
    console.error('[SmartTranslationWorker] Error in message handler')
    console.error('Message type:', type)
    console.error('Error object:', error)
    console.error('Error message:', error?.message)
    console.error('Error stack:', error?.stack)
    console.error('Error name:', error?.name)
    console.error('Error cause:', error?.cause)
    console.error('Error string:', String(error))
    try {
      console.error('Error JSON:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
    } catch (e) {
      console.error('Cannot stringify error:', e)
    }

    // Extract detailed error message
    let errorMessage = 'Unknown error'
    if (error?.message) {
      errorMessage = error.message
    } else if (typeof error === 'string') {
      errorMessage = error
    } else if (error?.toString && error.toString() !== '[object Object]') {
      errorMessage = error.toString()
    } else {
      errorMessage = JSON.stringify(error, null, 2)
    }

    self.postMessage({
      type: 'error',
      data: {
        message: errorMessage,
        stack: error?.stack,
        name: error?.name,
        cause: error?.cause,
        originalError: error?.toString?.(),
      },
      taskId: data?.taskId,
    } as SmartTranslationWorkerResponse)
  }
})

