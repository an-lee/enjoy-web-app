/**
 * Model Initializer Service
 * Handles model preloading for faster inference
 */

import type { LocalModelConfig } from '../../../types'
import { useLocalModelsStore } from '@/stores/local-models'
import {
  getASRWorker,
  getSmartTranslationWorker,
  getDictionaryWorker,
  getTTSWorker,
} from '../workers/worker-manager'
import {
  DEFAULT_ASR_MODEL,
  DEFAULT_SMART_TRANSLATION_MODEL,
  DEFAULT_DICTIONARY_MODEL,
  DEFAULT_TTS_MODEL,
} from '../constants'

/**
 * Initialize model (preload for faster inference)
 */
export async function initializeModel(
  modelType: 'asr' | 'smartTranslation' | 'dictionary' | 'tts',
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

        // Progress messages are handled by worker-manager.ts global listener
        // We only handle ready and error here
        if (type === 'ready' && data.model === modelName) {
          clearTimeout(timeout)
          worker.removeEventListener('message', messageHandler)
          // Ensure loading state is cleared (setModelLoaded is called by worker-manager.ts)
          store.setModelLoading('asr', false)
          resolve()
        } else if (type === 'error') {
          clearTimeout(timeout)
          worker.removeEventListener('message', messageHandler)
          store.setModelLoading('asr', false)
          reject(new Error(data.message))
        }
        // Note: progress messages are handled by worker-manager.ts global listener
      }

      worker.addEventListener('message', messageHandler)

      worker.postMessage({
        type: 'init',
        data: { model: modelName },
      })
    })
  } else if (modelType === 'smartTranslation') {
    const modelName = modelConfig?.model || DEFAULT_SMART_TRANSLATION_MODEL
    const worker = getSmartTranslationWorker()

    store.setModelLoading('smartTranslation', true)

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Model initialization timeout'))
      }, 300000)

      const messageHandler = (event: MessageEvent) => {
        const { type, data } = event.data

        // Progress messages are handled by worker-manager.ts global listener
        // We only handle ready and error here
        if (type === 'ready' && data.model === modelName) {
          clearTimeout(timeout)
          worker.removeEventListener('message', messageHandler)
          // Ensure loading state is cleared (setModelLoaded is called by worker-manager.ts)
          store.setModelLoading('smartTranslation', false)
          resolve()
        } else if (type === 'error') {
          clearTimeout(timeout)
          worker.removeEventListener('message', messageHandler)
          store.setModelLoading('smartTranslation', false)
          reject(new Error(data.message))
        }
        // Note: progress messages are handled by worker-manager.ts global listener
      }

      worker.addEventListener('message', messageHandler)

      worker.postMessage({
        type: 'init',
        data: { model: modelName },
      })
    })
  } else if (modelType === 'dictionary') {
    const modelName = modelConfig?.model || DEFAULT_DICTIONARY_MODEL
    const worker = getDictionaryWorker()

    store.setModelLoading('dictionary', true)

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Model initialization timeout'))
      }, 300000)

      const messageHandler = (event: MessageEvent) => {
        const { type, data } = event.data

        // Progress messages are handled by worker-manager.ts global listener
        // We only handle ready and error here
        if (type === 'ready' && data.model === modelName) {
          clearTimeout(timeout)
          worker.removeEventListener('message', messageHandler)
          // Ensure loading state is cleared (setModelLoaded is called by worker-manager.ts)
          store.setModelLoading('dictionary', false)
          resolve()
        } else if (type === 'error') {
          clearTimeout(timeout)
          worker.removeEventListener('message', messageHandler)
          store.setModelLoading('dictionary', false)
          reject(new Error(data.message))
        }
        // Note: progress messages are handled by worker-manager.ts global listener
      }

      worker.addEventListener('message', messageHandler)

      worker.postMessage({
        type: 'init',
        data: { model: modelName },
      })
    })
  } else if (modelType === 'tts') {
    const modelName = modelConfig?.model || DEFAULT_TTS_MODEL
    const worker = getTTSWorker()

    store.setModelLoading('tts', true)

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Model initialization timeout'))
      }, 300000)

      const messageHandler = (event: MessageEvent) => {
        const { type, data } = event.data

        // Progress messages are handled by worker-manager.ts global listener
        // We only handle ready and error here
        if (type === 'ready' && data.model === modelName) {
          clearTimeout(timeout)
          worker.removeEventListener('message', messageHandler)
          // Ensure loading state is cleared (setModelLoaded is called by worker-manager.ts)
          store.setModelLoading('tts', false)
          resolve()
        } else if (type === 'error') {
          clearTimeout(timeout)
          worker.removeEventListener('message', messageHandler)
          store.setModelLoading('tts', false)
          reject(new Error(data.message))
        }
        // Note: progress messages are handled by worker-manager.ts global listener
      }

      worker.addEventListener('message', messageHandler)

      worker.postMessage({
        type: 'init',
        data: { model: modelName },
      })
    })
  }
}

