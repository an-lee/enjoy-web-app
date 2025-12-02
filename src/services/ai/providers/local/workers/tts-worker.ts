/**
 * TTS Web Worker
 * Handles text-to-speech model loading and synthesis in a separate thread
 * Uses Supertonic TTS ONNX model for high-quality speech synthesis
 */

import { pipeline, env } from '@huggingface/transformers'
import { DEFAULT_TTS_MODEL } from '../constants'

// Configure transformers.js
env.allowLocalModels = false
env.allowRemoteModels = true

interface TTSWorkerMessage {
  type: 'init' | 'synthesize' | 'checkStatus'
  data?: {
    model?: string
    text?: string
    language?: string
    voice?: string
    taskId?: string
  }
}

interface TTSWorkerResponse {
  type: 'progress' | 'ready' | 'result' | 'error' | 'status'
  data?: any
  taskId?: string
}

// Singleton pattern for TTS pipeline
class TTSPipelineSingleton {
  static instance: any = null
  static modelName: string | null = null
  static loading: boolean = false
  static progressCallback: ((progress: any) => void) | null = null

  static async getInstance(
    modelName: string = DEFAULT_TTS_MODEL,
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
      // Use text-to-speech pipeline for TTS models
      this.instance = await pipeline('text-to-speech', modelName, {
        progress_callback: (progress: any) => {
          if (this.progressCallback) {
            this.progressCallback(progress)
          }
          // Send progress to main thread
          self.postMessage({
            type: 'progress',
            data: progress,
          } as TTSWorkerResponse)
        },
      })

      this.loading = false

      // Notify main thread that model is ready
      self.postMessage({
        type: 'ready',
        data: { model: modelName },
      } as TTSWorkerResponse)

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
self.addEventListener('message', async (event: MessageEvent<TTSWorkerMessage>) => {
  const { type, data } = event.data

  try {
    switch (type) {
      case 'init': {
        // Initialize model
        const modelName = data?.model || DEFAULT_TTS_MODEL
        await TTSPipelineSingleton.getInstance(modelName, (progress) => {
          self.postMessage({
            type: 'progress',
            data: progress,
          } as TTSWorkerResponse)
        })
        break
      }

      case 'checkStatus': {
        // Check if model is loaded
        self.postMessage({
          type: 'status',
          data: {
            loaded: TTSPipelineSingleton.isLoaded(),
            model: TTSPipelineSingleton.getModelName(),
          },
        } as TTSWorkerResponse)
        break
      }

      case 'synthesize': {
        // Synthesize speech from text
        if (!data?.text) {
          throw new Error('Text is required for TTS synthesis')
        }

        // Validate and normalize text input
        const text = String(data.text).trim()
        if (!text || text.length === 0) {
          throw new Error('Text cannot be empty after trimming')
        }

        // Check if text contains only whitespace or special characters
        // This helps prevent cases where text encoder produces empty sequences
        const hasValidContent = /[\p{L}\p{N}]/u.test(text)
        if (!hasValidContent) {
          throw new Error(
            'Text must contain at least one letter or number. Text containing only special characters or whitespace cannot be synthesized.'
          )
        }

        const modelName = data?.model || DEFAULT_TTS_MODEL
        const synthesizer = await TTSPipelineSingleton.getInstance(modelName)

        // Prepare options
        const options: any = {}
        if (data.language) {
          options.language = data.language
        }
        if (data.voice) {
          options.voice = data.voice
        }

        // Supertonic models require speaker_embeddings as a URL to a .bin file
        // According to the documentation, speaker_embeddings should be a URL string
        // pointing to a voice file (e.g., 'https://huggingface.co/onnx-community/Supertonic-TTS-ONNX/resolve/main/voices/F1.bin')
        if (modelName.includes('Supertonic')) {
          // Use default voice F1 if no voice is specified
          // Available voices: F1, F2, M1, M2 (Female 1/2, Male 1/2)
          const voiceName = data.voice || 'F1'
          options.speaker_embeddings = `https://huggingface.co/onnx-community/Supertonic-TTS-ONNX/resolve/main/voices/${voiceName}.bin`

          // Optional: Set quality and speed parameters
          // Higher num_inference_steps = better quality (typically 1-50)
          options.num_inference_steps = 5
          // Higher speed = faster speech (typically 0.8-1.2)
          options.speed = 1.0
        }

        // Run TTS synthesis
        // Use normalized text instead of original data.text
        const result = await synthesizer(text, options)

        // Extract audio data from result
        let audioData: ArrayBuffer | Float32Array | Uint8Array | Blob

        // Handle different result formats
        if (result.audio) {
          audioData = result.audio
        } else if (result.waveform) {
          audioData = result.waveform
        } else if (Array.isArray(result)) {
          audioData = result[0]?.audio || result[0]?.waveform || new Float32Array()
        } else if (result instanceof Blob) {
          audioData = result
        } else {
          audioData = result as any
        }

        // Convert to ArrayBuffer for transfer via postMessage
        let audioArrayBuffer: ArrayBuffer
        let sampleRate = 22050 // Default sample rate

        if (audioData instanceof Blob) {
          // Convert Blob to ArrayBuffer
          audioArrayBuffer = await audioData.arrayBuffer()
        } else if (audioData instanceof ArrayBuffer) {
          audioArrayBuffer = audioData
        } else if (audioData instanceof Float32Array || audioData instanceof Uint8Array) {
          // Convert Float32Array/Uint8Array to WAV format ArrayBuffer
          // Get sample rate from result if available
          sampleRate = result.sampling_rate || result.sample_rate || 22050

          const numChannels = 1 // Mono
          const bitsPerSample = 16
          const byteRate = sampleRate * numChannels * (bitsPerSample / 8)
          const blockAlign = numChannels * (bitsPerSample / 8)
          const dataSize = audioData.length * (bitsPerSample / 8)
          const fileSize = 36 + dataSize

          const buffer = new ArrayBuffer(44 + dataSize)
          const view = new DataView(buffer)

          // WAV header
          const writeString = (str: string, offset: number) => {
            for (let i = 0; i < str.length; i++) {
              view.setUint8(offset + i, str.charCodeAt(i))
            }
          }

          let offset = 0
          writeString('RIFF', offset)
          offset += 4
          view.setUint32(offset, fileSize, true)
          offset += 4
          writeString('WAVE', offset)
          offset += 4
          writeString('fmt ', offset)
          offset += 4
          view.setUint32(offset, 16, true) // fmt chunk size
          offset += 4
          view.setUint16(offset, 1, true) // PCM format
          offset += 2
          view.setUint16(offset, numChannels, true)
          offset += 2
          view.setUint32(offset, sampleRate, true)
          offset += 4
          view.setUint32(offset, byteRate, true)
          offset += 4
          view.setUint16(offset, blockAlign, true)
          offset += 2
          view.setUint16(offset, bitsPerSample, true)
          offset += 2
          writeString('data', offset)
          offset += 4
          view.setUint32(offset, dataSize, true)
          offset += 4

          // Convert audio samples to 16-bit PCM
          if (audioData instanceof Float32Array) {
            for (let i = 0; i < audioData.length; i++) {
              const sample = Math.max(-1, Math.min(1, audioData[i]))
              view.setInt16(offset + i * 2, sample * 0x7fff, true)
            }
          } else {
            // Uint8Array - copy directly (assuming it's already PCM)
            const uint8View = new Uint8Array(buffer, offset)
            uint8View.set(audioData.slice(0, Math.min(audioData.length, dataSize)))
          }

          audioArrayBuffer = buffer
        } else {
          throw new Error('Unsupported audio data format')
        }

        // Calculate duration if available
        const duration = result.duration || (audioData instanceof Float32Array ? audioData.length / sampleRate : undefined)

        // Send result back to main thread
        // Note: ArrayBuffer can be transferred efficiently via postMessage
        self.postMessage(
          {
            type: 'result',
            data: {
              audioArrayBuffer: audioArrayBuffer,
              format: 'wav',
              duration: duration,
              sampleRate: sampleRate,
            },
            taskId: data?.taskId,
          } as TTSWorkerResponse,
          [audioArrayBuffer] // Transfer ownership for efficiency
        )
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
    } as TTSWorkerResponse)
  }
})

