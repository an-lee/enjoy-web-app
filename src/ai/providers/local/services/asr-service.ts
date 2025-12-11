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
import { convertToTranscriptFormat } from '../../../utils/transcript-segmentation'
import type { TranscriptLine } from '@/types/db/transcript'

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

        // Process chunks: chunks are word-level timestamps
        const wordChunks = data.chunks || []

        // Legacy segments format (for backward compatibility)
        const segments = wordChunks.map((chunk: any) => ({
          text: chunk.text || '',
          start: chunk.timestamp?.[0] || 0,
          end: chunk.timestamp?.[1] || 0,
        }))

        // Convert word chunks to segment + word nested structure using intelligent segmentation
        // Convert ASR chunks format to RawWordTiming format (times in seconds)
        const rawTimings = wordChunks.map((chunk: any) => ({
          text: chunk.text || '',
          startTime: chunk.timestamp?.[0] || 0,
          endTime: chunk.timestamp?.[1] || 0,
        }))

        // Use intelligent segmentation to create segments with nested word timeline
        const transcript = convertToTranscriptFormat(
          data.text || '',
          rawTimings,
          language
        )

        // Convert TTSTranscriptItem[] to TranscriptLine[]
        // Both formats are compatible, but we need to ensure type consistency
        const timeline: TranscriptLine[] = transcript.timeline.map((item) => ({
          text: item.text,
          start: item.start,
          duration: item.duration,
          timeline: item.timeline?.map((word) => ({
            text: word.text,
            start: word.start,
            duration: word.duration,
          })),
        }))

        resolve({
          text: data.text || '',
          segments,
          timeline,
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

