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
import { WorkerTaskManager } from '@/page/lib/workers/worker-task-manager'

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

  const taskManager = new WorkerTaskManager({
    workerId: 'smart-translation-worker',
    workerType: 'smart-translation',
    metadata: {
      text: text.substring(0, 50), // Store first 50 chars for reference
      sourceLanguage,
      targetLanguage,
      style,
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
    return new Promise<LocalTranslationResult>((resolve, reject) => {
      const timeout = setTimeout(() => {
        worker.removeEventListener('message', messageHandler)
        reject(new Error('Smart translation timeout'))
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
          reject(new Error(data.message || 'Smart translation failed'))
        } else if (type === 'cancelled' && responseTaskId === taskId) {
          clearTimeout(timeout)
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
  })
}

