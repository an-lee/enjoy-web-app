/**
 * Fast Translation Service
 * Handles fast translation using dedicated translation models (e.g., NLLB)
 * Optimized for speed, used for subtitle translation
 */

import type { LocalModelConfig } from '../../types'
import { useLocalModelsStore } from '@/stores/local-models'
import { getFastTranslationWorker } from '../workers/worker-manager'
import { DEFAULT_FAST_TRANSLATION_MODEL } from '../config'
import type { LocalTranslationResult } from '../types'

/**
 * Fast translate text using dedicated translation model
 */
export async function fastTranslate(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  modelConfig?: LocalModelConfig
): Promise<LocalTranslationResult> {
  const modelName = modelConfig?.model || DEFAULT_FAST_TRANSLATION_MODEL
  const store = useLocalModelsStore.getState()

  // Check if model is already loaded
  const modelStatus = store.models.fastTranslation
  if (!modelStatus.loaded || modelStatus.modelName !== modelName) {
    // Initialize model loading
    store.setModelLoading('fastTranslation', true)

    const worker = getFastTranslationWorker()

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
  const worker = getFastTranslationWorker()
  const taskId = `fast-translation-${Date.now()}-${Math.random()}`

  return new Promise<LocalTranslationResult>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Fast translation timeout'))
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
        reject(new Error(data.message || 'Fast translation failed'))
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
}

