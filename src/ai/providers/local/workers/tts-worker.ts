/**
 * TTS Web Worker
 * Handles text-to-speech model loading and synthesis in a separate thread
 * Uses Kokoro TTS ONNX model for high-quality speech synthesis with timestamps
 */

import { KokoroTTS } from 'kokoro-js'
import { DEFAULT_TTS_MODEL } from '../constants'
import {
  convertToTranscriptFormat,
  type RawWordTiming,
} from '@/ai/utils/transcript-segmentation'
import type { TTSTranscript } from '@/ai/types'

interface TTSWorkerMessage {
  type: 'init' | 'synthesize' | 'checkStatus' | 'cancel'
  data?: {
    model?: string
    text?: string
    language?: string
    voice?: string
    taskId?: string
  }
}

interface TTSWorkerResponse {
  type: 'progress' | 'ready' | 'result' | 'error' | 'status' | 'cancelled'
  data?: any
  taskId?: string
}

// Track active tasks for cancellation
const activeTasks = new Set<string>()

// Singleton pattern for TTS model
class KokoroTTSSingleton {
  static instance: KokoroTTS | null = null
  static modelName: string | null = null
  static loading: boolean = false

  static async getInstance(
    modelName: string = DEFAULT_TTS_MODEL,
    progressCallback?: (progress: any) => void
  ): Promise<KokoroTTS> {
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
      // Send initial progress
      if (progressCallback) {
        progressCallback({ status: 'loading', name: modelName, progress: 0 })
      }

      // Load Kokoro TTS model
      // Use q8 quantization for good balance of quality and speed
      this.instance = await KokoroTTS.from_pretrained(modelName, {
        dtype: 'q8', // Options: "fp32", "fp16", "q8", "q4", "q4f16"
        device: 'wasm', // Use WASM for browser compatibility
        progress_callback: (progress: any) => {
          if (progressCallback) {
            progressCallback(progress)
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

  static listVoices(): string[] {
    if (this.instance) {
      try {
        const voices = this.instance.list_voices()
        return Array.isArray(voices) ? voices : []
      } catch {
        return []
      }
    }
    return []
  }
}


/**
 * Extract word-level timestamps from Kokoro TTS output
 * Based on: https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX-timestamped/discussions/2
 *
 * The timestamped model outputs durations for each token/phoneme.
 * We need to:
 * 1. Split the input text into words
 * 2. Map durations to words
 * 3. Calculate cumulative timestamps
 * 4. Convert to TranscriptLine format (sentence -> word hierarchy)
 */
function extractTimestamps(
  text: string,
  result: any,
  language?: string
): TTSTranscript | undefined {
  // Check if we have timestamp/duration information
  // The result may contain timestamps or durations depending on the model version
  if (!result) {
    return undefined
  }

  // Try to get word timestamps from the result
  // kokoro-js may provide timestamps in different formats
  let rawTimings: RawWordTiming[] = []

  // If the result has a timestamps array
  if (result.timestamps && Array.isArray(result.timestamps)) {
    rawTimings = result.timestamps.map(
      (ts: { word?: string; text?: string; start: number; end: number }) => ({
        text: ts.word || ts.text || '',
        startTime: ts.start,
        endTime: ts.end,
      })
    )
  }
  // If the result has word_timestamps
  else if (result.word_timestamps && Array.isArray(result.word_timestamps)) {
    rawTimings = result.word_timestamps.map(
      (ts: { word?: string; text?: string; start: number; end: number }) => ({
        text: ts.word || ts.text || '',
        startTime: ts.start,
        endTime: ts.end,
      })
    )
  }
  // If the result has durations, we need to calculate timestamps manually
  else if (result.durations && Array.isArray(result.durations)) {
    const words = text.split(/\s+/).filter((w) => w.length > 0)
    const durations = result.durations as number[]

    // Magic divisor based on Kokoro model's internal timing
    // See: https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX-timestamped/discussions/2
    const TIME_DIVISOR = 80

    // Skip boundary tokens (first and last are padding)
    let currentTime = 0
    if (durations.length >= 3) {
      // First boundary timing
      currentTime = (2 * Math.max(0, durations[0] - 3)) / TIME_DIVISOR
    }

    // Calculate timestamps for each word
    // This is a simplified approach - for more accurate results,
    // you would need to map phonemes to words
    const durationPerWord = durations.length > 2 ? durations.slice(1, -1) : []
    const avgDurationPerWord =
      durationPerWord.length > 0
        ? durationPerWord.reduce((a, b) => a + b, 0) /
          durationPerWord.length /
          TIME_DIVISOR
        : 0.3

    for (const word of words) {
      const startTime = currentTime
      // Estimate word duration based on character count
      const wordDuration = avgDurationPerWord * (1 + word.length * 0.1)
      const endTime = startTime + wordDuration
      rawTimings.push({
        text: word,
        startTime,
        endTime,
      })
      currentTime = endTime
    }
  }
  // Fallback: estimate timestamps based on audio duration and text
  else if (result.sampling_rate && result.audio) {
    const audioDuration =
      result.audio instanceof Float32Array
        ? result.audio.length / result.sampling_rate
        : 0
    const words = text.split(/\s+/).filter((w) => w.length > 0)

    if (words.length > 0 && audioDuration > 0) {
      // Simple linear distribution with slight bias towards longer words
      const totalChars = words.reduce((sum, w) => sum + w.length, 0)
      let currentTime = 0

      for (const word of words) {
        const wordWeight = word.length / totalChars
        const wordDuration = audioDuration * wordWeight
        rawTimings.push({
          text: word,
          startTime: currentTime,
          endTime: currentTime + wordDuration,
        })
        currentTime += wordDuration
      }
    }
  }

  if (rawTimings.length === 0) {
    return undefined
  }

  // Convert raw timings to TranscriptLine format (sentence -> word hierarchy)
  return convertToTranscriptFormat(text, rawTimings, language)
}


/**
 * Convert Float32Array audio to WAV format ArrayBuffer
 */
function float32ToWav(
  audioData: Float32Array,
  sampleRate: number
): ArrayBuffer {
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
  for (let i = 0; i < audioData.length; i++) {
    const sample = Math.max(-1, Math.min(1, audioData[i]))
    view.setInt16(offset + i * 2, sample * 0x7fff, true)
  }

  return buffer
}

// Listen for messages from main thread
self.addEventListener('message', async (event: MessageEvent<TTSWorkerMessage>) => {
  const { type, data } = event.data

  try {
    switch (type) {
      case 'init': {
        // Initialize model
        const modelName = data?.model || DEFAULT_TTS_MODEL
        await KokoroTTSSingleton.getInstance(modelName, (progress) => {
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
            loaded: KokoroTTSSingleton.isLoaded(),
            model: KokoroTTSSingleton.getModelName(),
            voices: KokoroTTSSingleton.listVoices(),
          },
        } as TTSWorkerResponse)
        break
      }

      case 'cancel': {
        // Cancel a specific task
        const taskId = data?.taskId
        if (taskId) {
          activeTasks.delete(taskId)
          self.postMessage({
            type: 'cancelled',
            data: { message: 'Task cancelled' },
            taskId,
          } as TTSWorkerResponse)
        }
        break
      }

      case 'synthesize': {
        // Synthesize speech from text
        if (!data?.text) {
          throw new Error('Text is required for TTS synthesis')
        }

        const taskId = data?.taskId
        if (!taskId) {
          throw new Error('Task ID is required')
        }

        // Add task to active set
        activeTasks.add(taskId)

        // Validate and normalize text input
        const text = String(data.text).trim()
        if (!text || text.length === 0) {
          activeTasks.delete(taskId)
          throw new Error('Text cannot be empty after trimming')
        }

        // Check if text contains only whitespace or special characters
        const hasValidContent = /[\p{L}\p{N}]/u.test(text)
        if (!hasValidContent) {
          activeTasks.delete(taskId)
          throw new Error(
            'Text must contain at least one letter or number. Text containing only special characters or whitespace cannot be synthesized.'
          )
        }

        const modelName = data?.model || DEFAULT_TTS_MODEL
        const tts = await KokoroTTSSingleton.getInstance(modelName)

        // Check again after model loading (in case cancelled during loading)
        if (!activeTasks.has(taskId)) {
          self.postMessage({
            type: 'cancelled',
            data: { message: 'Task cancelled' },
            taskId,
          } as TTSWorkerResponse)
          break
        }

        // Use specified voice or default to best quality voice
        const voice = data.voice || 'af_heart'

        // Generate speech with Kokoro TTS
        // Cast voice to any to handle dynamic voice options
        const result = await tts.generate(text, {
          voice: voice as any,
        })

        // Check if task was cancelled during synthesis
        if (!activeTasks.has(taskId)) {
          self.postMessage({
            type: 'cancelled',
            data: { message: 'Task cancelled' },
            taskId,
          } as TTSWorkerResponse)
          break
        }

        // Extract audio data
        // Kokoro returns an Audio object with audio property (Float32Array) and sampling_rate
        let audioArrayBuffer: ArrayBuffer
        let sampleRate = 24000 // Kokoro uses 24kHz

        // Get audio data from result
        const audioData = result.audio
        if (audioData instanceof Float32Array) {
          sampleRate = result.sampling_rate || 24000
          audioArrayBuffer = float32ToWav(audioData, sampleRate)
        } else if (result.toBlob) {
          // If result has toBlob method, use it
          const blob = result.toBlob()
          audioArrayBuffer = await blob.arrayBuffer()
        } else {
          throw new Error('Unsupported audio data format from Kokoro TTS')
        }

        // Extract timestamps if available (timestamped model)
        const transcript = extractTimestamps(text, result, data.language)

        // Calculate duration
        const duration =
          audioData instanceof Float32Array
            ? audioData.length / sampleRate
            : undefined

        // Final check before sending result
        if (!activeTasks.has(taskId)) {
          self.postMessage({
            type: 'cancelled',
            data: { message: 'Task cancelled' },
            taskId,
          } as TTSWorkerResponse)
          break
        }

        // Remove task from active set
        activeTasks.delete(taskId)

        // Send result back to main thread
        self.postMessage(
          {
            type: 'result',
            data: {
              audioArrayBuffer,
              format: 'wav',
              duration,
              sampleRate,
              transcript,
            },
            taskId,
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
