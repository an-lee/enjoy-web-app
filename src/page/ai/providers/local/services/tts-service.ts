/**
 * TTS Service
 * Handles text-to-speech synthesis using local TTS models (Kokoro TTS ONNX)
 * Supports word-level timestamps for transcript generation
 */

import type { LocalModelConfig } from '../../../types'
import type { LocalTTSResult, LocalTTSTranscript } from '../types'
import { useLocalModelsStore } from '@/page/stores/local-models'
import { getTTSWorker } from '../workers/worker-manager'
import { DEFAULT_TTS_MODEL } from '../constants'
import { WorkerTaskManager } from '@/page/lib/workers/worker-task-manager'

/**
 * Synthesize speech from text using local TTS model
 * Returns audio blob and optional transcript with word-level timestamps
 */
export async function synthesize(
  text: string,
  language: string,
  voice?: string,
  modelConfig?: LocalModelConfig,
  signal?: AbortSignal
): Promise<LocalTTSResult> {
  // Validate input text
  if (!text || typeof text !== 'string') {
    throw new Error('Text must be a non-empty string')
  }

  const trimmedText = text.trim()
  if (trimmedText.length === 0) {
    throw new Error('Text cannot be empty or contain only whitespace')
  }

  // Check if text contains valid content (at least one letter or number)
  const hasValidContent = /[\p{L}\p{N}]/u.test(trimmedText)
  if (!hasValidContent) {
    throw new Error(
      'Text must contain at least one letter or number. Text containing only special characters cannot be synthesized.'
    )
  }

  const modelName = modelConfig?.model || DEFAULT_TTS_MODEL
  const store = useLocalModelsStore.getState()

  // Check if model is already loaded
  const modelStatus = store.models.tts
  if (!modelStatus.loaded || modelStatus.modelName !== modelName) {
    // Initialize model loading
    store.setModelLoading('tts', true)

    const worker = getTTSWorker()

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

  // Synthesize using TTS worker
  const worker = getTTSWorker()

  const taskManager = new WorkerTaskManager({
    workerId: 'tts-worker',
    workerType: 'tts',
    metadata: {
      text: trimmedText.substring(0, 50), // Store first 50 chars for reference
      language,
      voice,
      model: modelName,
    },
    onCancel: () => {
      const taskId = taskManager.getTaskId()
      if (taskId) {
        worker.postMessage({
          type: 'cancel',
          data: { taskId },
        })
      }
    },
  })

  // Handle abort signal
  if (signal) {
    if (signal.aborted) {
      throw new Error('Request was cancelled')
    }
    signal.addEventListener('abort', () => {
      taskManager.cancel()
    })
  }

  return taskManager.execute(async (taskId) => {
    return new Promise<LocalTTSResult>((resolve, reject) => {
      const timeout = setTimeout(() => {
        worker.removeEventListener('message', messageHandler)
        reject(new Error('TTS synthesis timeout'))
      }, 300000) // 5 minutes timeout

      const messageHandler = (event: MessageEvent) => {
        const { type, data, taskId: responseTaskId } = event.data

        if (type === 'result' && responseTaskId === taskId) {
          clearTimeout(timeout)
          worker.removeEventListener('message', messageHandler)

          // Convert ArrayBuffer back to Blob
          const audioBlob = new Blob([data.audioArrayBuffer], { type: 'audio/wav' })

          // Build result with optional transcript
          const result: LocalTTSResult = {
            audioBlob,
            format: data.format || 'wav',
            duration: data.duration,
          }

          // Add transcript if available (from timestamped model)
          if (data.transcript) {
            result.transcript = data.transcript as LocalTTSTranscript
          }

          resolve(result)
        } else if (type === 'error' && responseTaskId === taskId) {
          clearTimeout(timeout)
          worker.removeEventListener('message', messageHandler)
          reject(new Error(data.message || 'TTS synthesis failed'))
        } else if (type === 'cancelled' && responseTaskId === taskId) {
          clearTimeout(timeout)
          worker.removeEventListener('message', messageHandler)
          reject(new Error('Request was cancelled'))
        }
      }

      worker.addEventListener('message', messageHandler)

      // Send synthesize request with validated text
      worker.postMessage({
        type: 'synthesize',
        data: {
          text: trimmedText,
          language,
          voice,
          model: modelName,
          taskId,
        },
      })
    })
  })
}

