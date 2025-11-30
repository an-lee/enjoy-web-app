/**
 * ASR Service
 * Handles automatic speech recognition using local models
 */

import type { LocalModelConfig } from '../../../types'
import { useLocalModelsStore } from '@/stores/local-models'
import { getASRWorker } from '../workers/worker-manager'
import { audioBlobToFloat32Array } from '../utils/audio'
import { DEFAULT_ASR_MODEL } from '../constants'
import type { LocalASRResult } from '../types'

/**
 * Transcribe audio using local ASR model
 */
export async function transcribe(
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
}

