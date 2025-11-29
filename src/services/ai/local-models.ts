/**
 * Local Model Service (using @huggingface/transformers)
 * Supports free users and offline usage
 *
 * Note: Requires @huggingface/transformers package
 * bun add @huggingface/transformers
 */

import type { LocalModelConfig } from './types'
import { useLocalModelsStore } from '@/stores/local-models'

// Default model names
const DEFAULT_ASR_MODEL = 'Xenova/whisper-tiny'
const DEFAULT_TRANSLATION_MODEL = 'onnx-community/Qwen3-0.6B-DQ-ONNX'

/**
 * Convert audio Blob to Float32Array (16kHz mono)
 * Uses Web Audio API to decode and resample audio
 */
async function audioBlobToFloat32Array(audioBlob: Blob): Promise<Float32Array> {
  const arrayBuffer = await audioBlob.arrayBuffer()
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

  // Decode audio data
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

  // Get audio data (already Float32Array)
  const audioData = audioBuffer.getChannelData(0) // Get first channel

  // If stereo, convert to mono
  if (audioBuffer.numberOfChannels > 1) {
    const leftChannel = audioBuffer.getChannelData(0)
    const rightChannel = audioBuffer.getChannelData(1)
    const mono = new Float32Array(leftChannel.length)
    const SCALING_FACTOR = Math.sqrt(2)

    for (let i = 0; i < leftChannel.length; i++) {
      mono[i] = (SCALING_FACTOR * (leftChannel[i] + rightChannel[i])) / 2
    }

    // Resample to 16kHz if needed
    if (audioBuffer.sampleRate !== 16000) {
      return resampleAudio(mono, audioBuffer.sampleRate, 16000)
    }

    return mono
  }

  // Resample to 16kHz if needed
  if (audioBuffer.sampleRate !== 16000) {
    return resampleAudio(audioData, audioBuffer.sampleRate, 16000)
  }

  return audioData
}

/**
 * Normalize progress value to 0-1 range
 * transformers.js may return progress as 0-1 or 0-100
 */
function normalizeProgress(progressData: any): number {
  if (!progressData || typeof progressData.progress !== 'number') {
    return 0
  }

  let progress = progressData.progress

  // If progress is already 0-1, return as is (clamped to 0-1)
  if (progress <= 1) {
    return Math.max(0, Math.min(1, progress))
  }

  // If progress is 0-100, convert to 0-1
  if (progress <= 100) {
    return Math.max(0, Math.min(1, progress / 100))
  }

  // If progress > 100, clamp to 1
  return 1
}

/**
 * Simple linear resampling
 * For better quality, consider using a library like 'resampler' or 'audio-resampler'
 */
function resampleAudio(
  audioData: Float32Array,
  sourceSampleRate: number,
  targetSampleRate: number
): Float32Array {
  if (sourceSampleRate === targetSampleRate) {
    return audioData
  }

  const ratio = sourceSampleRate / targetSampleRate
  const newLength = Math.round(audioData.length / ratio)
  const result = new Float32Array(newLength)

  for (let i = 0; i < newLength; i++) {
    const srcIndex = i * ratio
    const index = Math.floor(srcIndex)
    const fraction = srcIndex - index

    if (index + 1 < audioData.length) {
      // Linear interpolation
      result[i] = audioData[index] * (1 - fraction) + audioData[index + 1] * fraction
    } else {
      result[i] = audioData[index]
    }
  }

  return result
}

/**
 * Create and manage ASR worker
 */
let asrWorker: Worker | null = null

function getASRWorker(): Worker {
  if (!asrWorker) {
    asrWorker = new Worker(
      new URL('./workers/asr-worker.ts', import.meta.url),
      { type: 'module' }
    )

      asrWorker.addEventListener('message', (event) => {
        const { type, data } = event.data

        if (type === 'ready') {
          useLocalModelsStore.getState().setModelLoaded('asr', data.model)
        } else if (type === 'progress') {
          // Normalize progress value to 0-1 range
          const normalizedProgress = normalizeProgress(data)
          useLocalModelsStore.getState().setModelProgress('asr', {
            ...data,
            progress: normalizedProgress,
          })
        } else if (type === 'error') {
          useLocalModelsStore.getState().setModelError('asr', data.message)
        }
      })
  }

  return asrWorker
}

/**
 * Create and manage Translation worker
 */
let translationWorker: Worker | null = null

function getTranslationWorker(): Worker {
  if (!translationWorker) {
    translationWorker = new Worker(
      new URL('./workers/translation-worker.ts', import.meta.url),
      { type: 'module' }
    )

      translationWorker.addEventListener('message', (event) => {
        const { type, data } = event.data

        if (type === 'ready') {
          useLocalModelsStore.getState().setModelLoaded('translation', data.model)
        } else if (type === 'progress') {
          // Normalize progress value to 0-1 range
          const normalizedProgress = normalizeProgress(data)
          useLocalModelsStore.getState().setModelProgress('translation', {
            ...data,
            progress: normalizedProgress,
          })
        } else if (type === 'error') {
          useLocalModelsStore.getState().setModelError('translation', data.message)
        }
      })
  }

  return translationWorker
}

/**
 * Create and manage Dictionary worker
 */
let dictionaryWorker: Worker | null = null

function getDictionaryWorker(): Worker {
  if (!dictionaryWorker) {
    dictionaryWorker = new Worker(
      new URL('./workers/dictionary-worker.ts', import.meta.url),
      { type: 'module' }
    )

      dictionaryWorker.addEventListener('message', (event) => {
        const { type, data } = event.data

        if (type === 'ready') {
          useLocalModelsStore.getState().setModelLoaded('dictionary', data.model)
        } else if (type === 'progress') {
          // Normalize progress value to 0-1 range
          const normalizedProgress = normalizeProgress(data)
          useLocalModelsStore.getState().setModelProgress('dictionary', {
            ...data,
            progress: normalizedProgress,
          })
        } else if (type === 'error') {
          useLocalModelsStore.getState().setModelError('dictionary', data.message)
        }
      })
  }

  return dictionaryWorker
}

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

export interface LocalTTSResult {
  audioBlob: Blob
  format: string
  duration?: number
}

// Note: Pronunciation assessment is not supported in local mode
// It requires Azure Speech Services for accurate phoneme-level analysis

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
    const modelName = modelConfig?.model || DEFAULT_ASR_MODEL
    const store = useLocalModelsStore.getState()

    // Check if model is already loaded
    const modelStatus = store.models.asr
    if (!modelStatus.loaded || modelStatus.modelName !== modelName) {
      // Initialize model loading
      store.setModelLoading('asr', true)

      const worker = getASRWorker()

      // Wait for worker to be ready
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Model loading timeout'))
        }, 300000) // 5 minutes timeout

        const messageHandler = (event: MessageEvent) => {
          const { type, data } = event.data

          if (type === 'ready' && data.model === modelName) {
            clearTimeout(timeout)
            worker.removeEventListener('message', messageHandler)
            resolve()
          } else if (type === 'error') {
            clearTimeout(timeout)
            worker.removeEventListener('message', messageHandler)
            reject(new Error(data.message))
          }
        }

        worker.addEventListener('message', messageHandler)

        // Send init message
        worker.postMessage({
          type: 'init',
          data: { model: modelName },
        })
      })
    }

    // Convert audio blob to Float32Array
    const audioData = await audioBlobToFloat32Array(audioBlob)

    // Transcribe using worker
    const worker = getASRWorker()
    const taskId = `asr-${Date.now()}-${Math.random()}`

    return new Promise<LocalASRResult>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Transcription timeout'))
      }, 300000) // 5 minutes timeout

      const messageHandler = (event: MessageEvent) => {
        const { type, data, taskId: responseTaskId } = event.data

        if (type === 'result' && responseTaskId === taskId) {
          clearTimeout(timeout)
          worker.removeEventListener('message', messageHandler)

          // Process chunks into segments if available
          const segments = data.chunks?.map((chunk: any) => ({
            text: chunk.text || '',
            start: chunk.timestamp?.[0] || 0,
            end: chunk.timestamp?.[1] || 0,
          }))

          resolve({
            text: data.text || '',
            segments,
            language: language,
          })
        } else if (type === 'error' && responseTaskId === taskId) {
          clearTimeout(timeout)
          worker.removeEventListener('message', messageHandler)
          reject(new Error(data.message || 'Transcription failed'))
        }
      }

      worker.addEventListener('message', messageHandler)

      // Send transcription request
      worker.postMessage({
        type: 'transcribe',
        data: {
          audioData,
          language,
          model: modelName,
          taskId,
        },
      })
    })
  },

  /**
   * Local Translation (using NLLB or similar translation models)
   */
  async translate(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    modelConfig?: LocalModelConfig
  ): Promise<LocalTranslationResult> {
    const modelName = modelConfig?.model || DEFAULT_TRANSLATION_MODEL
    const store = useLocalModelsStore.getState()

    // Check if model is already loaded
    const modelStatus = store.models.translation
    if (!modelStatus.loaded || modelStatus.modelName !== modelName) {
      // Initialize model loading
      store.setModelLoading('translation', true)

      const worker = getTranslationWorker()

      // Wait for worker to be ready
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Model loading timeout'))
        }, 300000) // 5 minutes timeout

        const messageHandler = (event: MessageEvent) => {
          const { type, data } = event.data

          if (type === 'ready' && data.model === modelName) {
            clearTimeout(timeout)
            worker.removeEventListener('message', messageHandler)
            resolve()
          } else if (type === 'error') {
            clearTimeout(timeout)
            worker.removeEventListener('message', messageHandler)
            reject(new Error(data.message))
          }
        }

        worker.addEventListener('message', messageHandler)

        // Send init message
        worker.postMessage({
          type: 'init',
          data: { model: modelName },
        })
      })
    }

    // Translate using worker
    const worker = getTranslationWorker()
    const taskId = `translation-${Date.now()}-${Math.random()}`

    return new Promise<LocalTranslationResult>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Translation timeout'))
      }, 300000) // 5 minutes timeout

      const messageHandler = (event: MessageEvent) => {
        const { type, data, taskId: responseTaskId } = event.data

        if (type === 'result' && responseTaskId === taskId) {
          clearTimeout(timeout)
          worker.removeEventListener('message', messageHandler)

          resolve({
            translatedText: data.translatedText || '',
            sourceLanguage: data.sourceLanguage || sourceLanguage,
            targetLanguage: data.targetLanguage || targetLanguage,
          })
        } else if (type === 'error' && responseTaskId === taskId) {
          clearTimeout(timeout)
          worker.removeEventListener('message', messageHandler)
          reject(new Error(data.message || 'Translation failed'))
        }
      }

      worker.addEventListener('message', messageHandler)

      // Send translation request
      worker.postMessage({
        type: 'translate',
        data: {
          text,
          srcLang: sourceLanguage,
          tgtLang: targetLanguage,
          model: modelName,
          taskId,
        },
      })
    })
  },

  /**
   * Local Dictionary Lookup (using generative models with prompts)
   * Uses dedicated dictionary worker with generative model (e.g., Qwen3)
   */
  async lookup(
    word: string,
    context: string | undefined,
    sourceLanguage: string,
    targetLanguage: string,
    modelConfig?: LocalModelConfig
  ): Promise<LocalDictionaryResult> {
    const modelName = modelConfig?.model || DEFAULT_TRANSLATION_MODEL
    const store = useLocalModelsStore.getState()

    // Check if model is already loaded
    const modelStatus = store.models.dictionary
    if (!modelStatus.loaded || modelStatus.modelName !== modelName) {
      // Initialize model loading
      store.setModelLoading('dictionary', true)

      const worker = getDictionaryWorker()

      // Wait for worker to be ready
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Model loading timeout'))
        }, 300000) // 5 minutes timeout

        const messageHandler = (event: MessageEvent) => {
          const { type, data } = event.data

          if (type === 'ready' && data.model === modelName) {
            clearTimeout(timeout)
            worker.removeEventListener('message', messageHandler)
            resolve()
          } else if (type === 'error') {
            clearTimeout(timeout)
            worker.removeEventListener('message', messageHandler)
            reject(new Error(data.message))
          }
        }

        worker.addEventListener('message', messageHandler)

        // Send init message
        worker.postMessage({
          type: 'init',
          data: { model: modelName },
        })
      })
    }

    // Lookup using dictionary worker
    const worker = getDictionaryWorker()
    const taskId = `dictionary-${Date.now()}-${Math.random()}`

    return new Promise<LocalDictionaryResult>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Dictionary lookup timeout'))
      }, 300000) // 5 minutes timeout

      const messageHandler = (event: MessageEvent) => {
        const { type, data, taskId: responseTaskId } = event.data

        if (type === 'result' && responseTaskId === taskId) {
          clearTimeout(timeout)
          worker.removeEventListener('message', messageHandler)

          resolve({
            word: data.word || word,
            definitions: data.definitions || [],
            contextualExplanation: data.contextualExplanation,
          })
        } else if (type === 'error' && responseTaskId === taskId) {
          clearTimeout(timeout)
          worker.removeEventListener('message', messageHandler)
          reject(new Error(data.message || 'Dictionary lookup failed'))
        }
      }

      worker.addEventListener('message', messageHandler)

      // Send lookup request
      worker.postMessage({
        type: 'lookup',
        data: {
          word,
          context,
          srcLang: sourceLanguage,
          tgtLang: targetLanguage,
          model: modelName,
          taskId,
        },
      })
    })
  },

  /**
   * Local TTS (using browser Web Speech API or transformers.js TTS models)
   */
  async synthesize(
    text: string,
    language: string,
    voice?: string,
    _modelConfig?: LocalModelConfig
  ): Promise<LocalTTSResult> {
    // Use Web Speech API as a simple local TTS solution
    // Note: This has limited language and voice support
    if (!('speechSynthesis' in window)) {
      throw new Error('Web Speech API is not supported in this browser')
    }

    return new Promise<LocalTTSResult>((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = language
      if (voice) {
        utterance.voice = speechSynthesis.getVoices().find(v => v.name === voice) || null
      }

      let startTime = Date.now()

      // Note: Web Speech API doesn't provide audio blob directly
      // We'll use a workaround with MediaRecorder if available
      // For now, we'll create a simple implementation

      utterance.onend = () => {
        const duration = (Date.now() - startTime) / 1000

        // Create a placeholder audio blob
        // In a real implementation, you'd capture the audio from speechSynthesis
        const audioBlob = new Blob([''], { type: 'audio/wav' })

        resolve({
          audioBlob,
          format: 'wav',
          duration,
        })
      }

      utterance.onerror = (error) => {
        reject(new Error(`TTS synthesis failed: ${error.error}`))
      }

      speechSynthesis.speak(utterance)
    })
  },

  /**
   * Initialize model (preload for faster inference)
   */
  async initializeModel(
    modelType: 'asr' | 'translation' | 'dictionary',
    modelConfig?: LocalModelConfig
  ): Promise<void> {
    const store = useLocalModelsStore.getState()

    if (modelType === 'asr') {
      const modelName = modelConfig?.model || DEFAULT_ASR_MODEL
      const worker = getASRWorker()

      store.setModelLoading('asr', true)

      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Model initialization timeout'))
        }, 300000)

        const messageHandler = (event: MessageEvent) => {
          const { type, data } = event.data

          if (type === 'ready' && data.model === modelName) {
            clearTimeout(timeout)
            worker.removeEventListener('message', messageHandler)
            resolve()
          } else if (type === 'error') {
            clearTimeout(timeout)
            worker.removeEventListener('message', messageHandler)
            reject(new Error(data.message))
          }
        }

        worker.addEventListener('message', messageHandler)

        worker.postMessage({
          type: 'init',
          data: { model: modelName },
        })
      })
    } else if (modelType === 'translation') {
      const modelName = modelConfig?.model || DEFAULT_TRANSLATION_MODEL
      const worker = getTranslationWorker()

      store.setModelLoading('translation', true)

      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Model initialization timeout'))
        }, 300000)

        const messageHandler = (event: MessageEvent) => {
          const { type, data } = event.data

          if (type === 'ready' && data.model === modelName) {
            clearTimeout(timeout)
            worker.removeEventListener('message', messageHandler)
            resolve()
          } else if (type === 'error') {
            clearTimeout(timeout)
            worker.removeEventListener('message', messageHandler)
            reject(new Error(data.message))
          }
        }

        worker.addEventListener('message', messageHandler)

        worker.postMessage({
          type: 'init',
          data: { model: modelName },
        })
      })
    } else if (modelType === 'dictionary') {
      const modelName = modelConfig?.model || DEFAULT_TRANSLATION_MODEL
      const worker = getDictionaryWorker()

      store.setModelLoading('dictionary', true)

      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Model initialization timeout'))
        }, 300000)

        const messageHandler = (event: MessageEvent) => {
          const { type, data } = event.data

          if (type === 'ready' && data.model === modelName) {
            clearTimeout(timeout)
            worker.removeEventListener('message', messageHandler)
            resolve()
          } else if (type === 'error') {
            clearTimeout(timeout)
            worker.removeEventListener('message', messageHandler)
            reject(new Error(data.message))
          }
        }

        worker.addEventListener('message', messageHandler)

        worker.postMessage({
          type: 'init',
          data: { model: modelName },
        })
      })
    }
  },

  /**
   * Check model status
   */
  getModelStatus(modelType: 'asr' | 'translation' | 'dictionary' | 'tts') {
    return useLocalModelsStore.getState().models[modelType]
  },
}

