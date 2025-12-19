/**
 * Smart Translation Service
 * Handles smart translation using generative models with style support
 * Supports different translation styles via prompts, used for user-generated content
 */

import type { LocalModelConfig } from '../../../types'
import { useLocalModelsStore } from '@/page/stores/local-models'
import { getSmartTranslationWorker } from '../workers/worker-manager'
import { DEFAULT_SMART_TRANSLATION_MODEL } from '../constants'
import type { LocalTranslationResult } from '../types'

/**
 * Smart translate text using generative model with style support
 */
export async function smartTranslate(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  style: string = 'natural',
  customPrompt?: string,
  modelConfig?: LocalModelConfig,
  signal?: AbortSignal
): Promise<LocalTranslationResult> {
  const modelName = modelConfig?.model || DEFAULT_SMART_TRANSLATION_MODEL
  const store = useLocalModelsStore.getState()

  // Check if model is already loaded
  const modelStatus = store.models.smartTranslation
  if (!modelStatus.loaded || modelStatus.modelName !== modelName) {
    // Initialize model loading
    store.setModelLoading('smartTranslation', true)

    const worker = getSmartTranslationWorker()

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
  const worker = getSmartTranslationWorker()
  const taskId = `smart-translation-${Date.now()}-${Math.random()}`

  return new Promise<LocalTranslationResult>((resolve, reject) => {
    // Handle abort signal
    const abortHandler = () => {
      clearTimeout(timeout)
      worker.removeEventListener('message', messageHandler)
      // Send cancel message to worker
      worker.postMessage({
        type: 'cancel',
        data: { taskId },
      })
      reject(new Error('Request was cancelled'))
    }

    if (signal) {
      if (signal.aborted) {
        reject(new Error('Request was cancelled'))
        return
      }
      signal.addEventListener('abort', abortHandler)
    }

    const timeout = setTimeout(() => {
      if (signal) {
        signal.removeEventListener('abort', abortHandler)
      }
      worker.removeEventListener('message', messageHandler)
      reject(new Error('Smart translation timeout'))
    }, 300000) // 5 minutes timeout

    const messageHandler = (event: MessageEvent) => {
      const { type, data, taskId: responseTaskId } = event.data

      if (type === 'result' && responseTaskId === taskId) {
        clearTimeout(timeout)
        if (signal) {
          signal.removeEventListener('abort', abortHandler)
        }
        worker.removeEventListener('message', messageHandler)

        resolve({
          translatedText: data.translatedText || '',
          sourceLanguage: data.sourceLanguage || sourceLanguage,
          targetLanguage: data.targetLanguage || targetLanguage,
        })
      } else if (type === 'error' && responseTaskId === taskId) {
        clearTimeout(timeout)
        if (signal) {
          signal.removeEventListener('abort', abortHandler)
        }
        worker.removeEventListener('message', messageHandler)
        reject(new Error(data.message || 'Smart translation failed'))
      } else if (type === 'cancelled' && responseTaskId === taskId) {
        clearTimeout(timeout)
        if (signal) {
          signal.removeEventListener('abort', abortHandler)
        }
        worker.removeEventListener('message', messageHandler)
        reject(new Error('Request was cancelled'))
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
        style,
        customPrompt,
        model: modelName,
        taskId,
      },
    })
  })
}

