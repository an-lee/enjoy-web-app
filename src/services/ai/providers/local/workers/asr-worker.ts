/**
 * ASR Web Worker
 * Handles Whisper model loading and transcription in a separate thread
 */

import { pipeline, env } from '@huggingface/transformers'
import { DEFAULT_ASR_MODEL } from '../constants'

// Configure transformers.js
env.allowLocalModels = false
env.allowRemoteModels = true

interface ASRWorkerMessage {
  type: 'init' | 'transcribe' | 'checkStatus'
  data?: {
    model?: string
    audioData?: Float32Array
    language?: string
    taskId?: string
  }
}

interface ASRWorkerResponse {
  type: 'progress' | 'ready' | 'result' | 'error' | 'status'
  data?: any
  taskId?: string
}

// Singleton pattern for ASR pipeline
class ASRPipelineSingleton {
  static instance: any = null
  static modelName: string | null = null
  static loading: boolean = false
  static progressCallback: ((progress: any) => void) | null = null

  static async getInstance(
    modelName: string = DEFAULT_ASR_MODEL,
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
    this.progressCallback = progressCallback || null

    try {
      this.instance = await pipeline('automatic-speech-recognition', modelName, {
        progress_callback: (progress: any) => {
          if (this.progressCallback) {
            this.progressCallback(progress)
          }
          // Send progress to main thread
          self.postMessage({
            type: 'progress',
            data: progress,
          } as ASRWorkerResponse)
        },
      })

      this.loading = false

      // Notify main thread that model is ready
      self.postMessage({
        type: 'ready',
        data: { model: modelName },
      } as ASRWorkerResponse)

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
self.addEventListener('message', async (event: MessageEvent<ASRWorkerMessage>) => {
  const { type, data } = event.data

  try {
    switch (type) {
      case 'init': {
        // Initialize model
        const modelName = data?.model || DEFAULT_ASR_MODEL
        await ASRPipelineSingleton.getInstance(modelName, (progress) => {
          self.postMessage({
            type: 'progress',
            data: progress,
          } as ASRWorkerResponse)
        })
        break
      }

      case 'checkStatus': {
        // Check if model is loaded
        self.postMessage({
          type: 'status',
          data: {
            loaded: ASRPipelineSingleton.isLoaded(),
            model: ASRPipelineSingleton.getModelName(),
          },
        } as ASRWorkerResponse)
        break
      }

      case 'transcribe': {
        // Transcribe audio
        if (!data?.audioData) {
          throw new Error('Audio data is required')
        }

        const modelName = data?.model || DEFAULT_ASR_MODEL
        const transcriber = await ASRPipelineSingleton.getInstance(modelName)

        // Prepare options
        const options: any = {}
        if (data.language) {
          options.language = data.language
        }

        // Run transcription
        const result = await transcriber(data.audioData, options)

        // Send result back to main thread
        self.postMessage({
          type: 'result',
          data: {
            text: result.text,
            chunks: result.chunks,
          },
          taskId: data?.taskId,
        } as ASRWorkerResponse)
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
    } as ASRWorkerResponse)
  }
})

