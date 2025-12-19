/**
 * Dictionary Service
 * Handles dictionary lookup using generative models with prompts
 */

import type { LocalModelConfig } from '../../../types'
import { useLocalModelsStore } from '@/page/stores/local-models'
import { getDictionaryWorker } from '../workers/worker-manager'
import { DEFAULT_SMART_TRANSLATION_MODEL } from '../constants'
import type { LocalDictionaryResult } from '../types'

/**
 * Lookup word in dictionary using generative model
 */
export async function lookup(
  word: string,
  context: string | undefined,
  sourceLanguage: string,
  targetLanguage: string,
  modelConfig?: LocalModelConfig
): Promise<LocalDictionaryResult> {
  const modelName = modelConfig?.model || DEFAULT_SMART_TRANSLATION_MODEL
  const store = useLocalModelsStore.getState()

  // Check if model is already loaded
  const modelStatus = store.models.smartDictionary
  if (!modelStatus.loaded || modelStatus.modelName !== modelName) {
    // Initialize model loading
    store.setModelLoading('smartDictionary', true)

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
}

